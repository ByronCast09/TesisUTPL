const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');
const pipelineConfig = require('../config/pipelineConfig');
const pipelineState = require('./pipelineStateService');
const { runWithConcurrency } = require('./concurrencyUtils');

const DOWNLOAD_CONCURRENCY = pipelineConfig.processing?.downloadConcurrency || 1;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildConnectionConfig() {
  const { remote } = pipelineConfig;
  if (!remote.host || !remote.username) {
    throw new Error('Configuración SFTP incompleta: RADAR_PIPELINE_REMOTE_HOST y RADAR_PIPELINE_REMOTE_USER son obligatorios');
  }

  const connection = {
    host: remote.host,
    port: remote.port,
    username: remote.username,
    forceIPv4: true,
    readyTimeout: Number(process.env.RADAR_PIPELINE_SFTP_TIMEOUT || 10000),
    debug: (msg) => {
      if (process.env.RADAR_PIPELINE_SFTP_DEBUG === 'true') {
        console.log(`[sftp] ${msg}`);
      }
    }
  };

  if (remote.privateKeyPath) {
    const expanded = remote.privateKeyPath.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '~');
    connection.privateKey = fs.readFileSync(expanded, 'utf-8');
    if (remote.passphrase) {
      connection.passphrase = remote.passphrase;
    }
  } else if (remote.password) {
    connection.password = remote.password;
    connection.tryKeyboard = true;
    connection.onKeyboardInteractive = (name, instructions, instructionsLang, prompts, finish) => {
      if (Array.isArray(prompts) && prompts.length > 0) {
        const responses = prompts.map((prompt) => {
          const normalized = (prompt && prompt.prompt) ? prompt.prompt.toLowerCase() : '';
          if (normalized.includes('password')) {
            return remote.password;
          }
          return '';
        });
        finish(responses);
      } else {
        finish([]);
      }
    };
  } else {
    throw new Error('Debe proporcionar RADAR_PIPELINE_REMOTE_PASSWORD o RADAR_PIPELINE_REMOTE_KEY_PATH');
  }

  return connection;
}

function resolveRemoteDir(radarId) {
  const radarsMap = pipelineConfig.radars || {};
  const normalizeRemotePath = (p) => {
    if (!p) return p;
    let normalized = p.replace(/\\/g, '/');
    if (!normalized.startsWith('/')) {
      if (/^[A-Za-z]:/.test(normalized)) {
        normalized = `/${normalized}`;
      } else {
        normalized = `/${normalized}`;
      }
    }
    return normalized.replace(/\/{2,}/g, '/');
  };

  if (radarsMap[radarId]) {
    const resolved = normalizeRemotePath(radarsMap[radarId]);
    if (process.env.RADAR_PIPELINE_SFTP_DEBUG === 'true') {
      console.log(`[pipeline] remote dir for ${radarId}: ${resolved}`);
    }
    return resolved;
  }
  if (!pipelineConfig.remote.baseDir) {
    throw new Error(`No se ha configurado baseDir remoto ni ruta específica para el radar ${radarId}`);
  }
  const fallback = normalizeRemotePath(path.posix.join(pipelineConfig.remote.baseDir.replace(/\\/g, '/'), radarId));
  if (process.env.RADAR_PIPELINE_SFTP_DEBUG === 'true') {
    console.log(`[pipeline] remote fallback dir for ${radarId}: ${fallback}`);
  }
  return fallback;
}

async function withSftp(callback) {
  const client = new SftpClient();
  try {
    const connectionConfig = buildConnectionConfig();
    await client.connect(connectionConfig);
    return await callback(client);
  } finally {
    try {
      await client.end();
    } catch (_) {
      // ignore
    }
  }
}

async function listRemoteFiles(radarId) {
  const remoteDir = resolveRemoteDir(radarId);
  return withSftp(async (client) => listFilesRecursive(client, remoteDir));
}

function buildLocalRawPath(radarId, fileName, modifyTime) {
  const { rawStorageDir } = pipelineConfig.paths;
  const date = new Date(modifyTime || Date.now());
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const dir = path.join(rawStorageDir, radarId, `${yyyy}`, `${mm}`, `${dd}`);
  ensureDir(dir);
  return path.join(dir, fileName);
}

async function downloadRemoteFile(radarId, remotePath, fileName, modifyTime, client = null) {
  const localPath = buildLocalRawPath(radarId, fileName, modifyTime);
  if (client) {
    await client.fastGet(remotePath, localPath, {});
    return localPath;
  }
  await withSftp(async (innerClient) => {
    await innerClient.fastGet(remotePath, localPath, {});
  });
  return localPath;
}

async function fetchNewRemoteFiles(radarId) {
  const files = await listRemoteFiles(radarId);
  if (!files.length) {
    return [];
  }

  const state = pipelineState.getState();
  const lastInfo = state.radars?.[radarId]?.lastRemote || null;

  const pending = [];

  const latestFile = files[files.length - 1];
  const latestDir = path.posix.dirname(latestFile.fullPath);

  for (const file of files) {
    if (!lastInfo) {
      // Primera sincronización: solo procesar archivos del directorio más reciente
      if (path.posix.dirname(file.fullPath) !== latestDir) {
        continue;
      }
      pending.push(file);
      continue;
    }

    if (file.modifyTime > lastInfo.modifyTime) {
      pending.push(file);
    } else if (file.modifyTime === lastInfo.modifyTime && file.fullPath > lastInfo.fullPath) {
      pending.push(file);
    }
  }

  if (!pending.length) {
    return [];
  }

  const downloads = await withSftp(async (client) => runWithConcurrency(
    pending,
    async (file) => {
      const localPath = await downloadRemoteFile(
        radarId,
        file.fullPath,
        file.name,
        file.modifyTime,
        client
      );
      return {
        radarId,
        remotePath: file.fullPath,
        fileName: file.name,
        modifyTime: file.modifyTime,
        localPath
      };
    },
    DOWNLOAD_CONCURRENCY
  ));

  const lastDownloaded = pending[pending.length - 1];
  pipelineState.updateState((current) => {
    if (!current.radars) {
      current.radars = {};
    }
    current.radars[radarId] = {
      ...(current.radars[radarId] || {}),
      lastRemote: {
        fullPath: lastDownloaded.fullPath,
        name: lastDownloaded.name,
        modifyTime: lastDownloaded.modifyTime
      }
    };
    return current;
  });

  return downloads;
}

module.exports = {
  fetchNewRemoteFiles,
  async fetchRemoteFilesForDate(radarId, dateStr) {
    const targetFiles = await module.exports.listRemoteFilesForDate(radarId, dateStr);
    if (!targetFiles.length) return [];
    return module.exports.downloadRemoteFiles(radarId, targetFiles);
  },
  async listRemoteFilesForDate(radarId, dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return [];
    }
    const remoteRoot = resolveRemoteDir(radarId);
    const targetDir = path.posix.join(remoteRoot, dateStr);
    return withSftp(async (client) => {
      let targetFiles = [];
      try {
        targetFiles = await listFilesRecursive(client, targetDir);
      } catch (err) {
        console.warn(`[pipeline] No se pudieron listar archivos para ${dateStr}: ${err.message}`);
        return [];
      }
      return targetFiles;
    });
  },
  async downloadRemoteFiles(radarId, files) {
    if (!Array.isArray(files) || !files.length) {
      return [];
    }
    return withSftp(async (client) => runWithConcurrency(
      files,
      async (file) => {
        const localPath = await downloadRemoteFile(
          radarId,
          file.fullPath,
          file.name,
          file.modifyTime,
          client
        );
        return {
          radarId,
          remotePath: file.fullPath,
          fileName: file.name,
          modifyTime: file.modifyTime,
          localPath
        };
      },
      DOWNLOAD_CONCURRENCY
    ));
  },
  async listRemoteDates(radarId) {
    const remoteDir = resolveRemoteDir(radarId);
    return withSftp(async (client) => {
      try {
        const entries = await client.list(remoteDir);
        return entries
          .filter((entry) => entry.type === 'd' && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
          .map((entry) => entry.name)
          .sort();
      } catch (err) {
        console.warn(`[pipeline] No se pudo listar fechas en ${remoteDir}: ${err.message}`);
        return [];
      }
    });
  },
  listRemoteFiles
};

async function listFilesRecursive(client, startDir) {
  const stack = [startDir];
  const files = [];

  while (stack.length) {
    const currentDir = stack.pop();
    let entries;
    try {
      entries = await client.list(currentDir);
    } catch (err) {
      console.warn(`[pipeline] No se pudo listar ${currentDir}: ${err.message}`);
      continue;
    }

    for (const entry of entries) {
      if (entry.name === '.' || entry.name === '..') {
        continue;
      }
      const entryPath = path.posix.join(currentDir, entry.name);
      if (entry.type === 'd') {
        stack.push(entryPath);
      } else if (entry.name.match(/\.(h5|hdf5|nc4|nc)$/i)) {
        files.push({
          name: entry.name,
          fullPath: entryPath,
          size: entry.size,
          modifyTime: entry.modifyTime,
          accessTime: entry.accessTime
        });
      }
    }
  }

  files.sort((a, b) => a.modifyTime - b.modifyTime);
  return files;
}

