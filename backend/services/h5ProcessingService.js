const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const pipelineConfig = require('../config/pipelineConfig');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getDefaultBounds(radarId) {
  const { bounds } = pipelineConfig;
  const perRadar = bounds.perRadar || {};
  if (perRadar[radarId]) {
    return perRadar[radarId];
  }
  return bounds.global || null;
}

function buildArgs({ inputPath, radarId, modifyTime }) {
  const args = [];
  const { processing, pythonBin } = pipelineConfig;
  const outputDir = path.join(pipelineConfig.paths.processedStorageDir, radarId);

  ensureDir(outputDir);

  const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'convert_h5_to_png.py');
  args.push(scriptPath, '--input', inputPath, '--radar', radarId, '--out-dir', outputDir);

  if (processing.transparentBelow !== undefined && !Number.isNaN(processing.transparentBelow)) {
    args.push('--transparent-below', String(processing.transparentBelow));
  }
  if (!Number.isNaN(processing.vmin)) {
    args.push('--vmin', String(processing.vmin));
  }
  if (!Number.isNaN(processing.vmax)) {
    args.push('--vmax', String(processing.vmax));
  }
  if (processing.cmap) {
    args.push('--cmap', processing.cmap);
  }

  const dataset = pipelineConfig.datasets[radarId];
  if (dataset) {
    args.push('--dataset', dataset);
  }

  const bounds = getDefaultBounds(radarId);
  if (bounds) {
    args.push('--default-bounds', `${bounds.latMin},${bounds.latMax},${bounds.lonMin},${bounds.lonMax}`);
  }

  if (modifyTime) {
    args.push('--source-timestamp', new Date(modifyTime).toISOString());
  }

  return { python: pipelineConfig.pythonBin, args, outputDir };
}

async function processH5File({ radarId, inputPath, modifyTime }) {
  const { python, args } = buildArgs({ radarId, inputPath, modifyTime });

  return new Promise((resolve, reject) => {
    const proc = spawn(python, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (error) => {
      reject(error);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`convert_h5_to_png.py exited with code ${code}. stderr: ${stderr}`));
      }

      const pngMatch = stdout.match(/PNG:(.+)/);
      const jsonMatch = stdout.match(/JSON:(.+)/);
      const metaMatch = stdout.match(/META:(.+)/);

      const pngPath = pngMatch ? pngMatch[1].trim() : null;
      const jsonPath = jsonMatch ? jsonMatch[1].trim() : null;

      if (!pngPath || !jsonPath) {
        return reject(new Error(`No se pudo determinar rutas de salida. stdout: ${stdout}`));
      }

      let metadata = null;
      if (metaMatch) {
        try {
          metadata = JSON.parse(metaMatch[1]);
        } catch (_) {
          // ignore parse errors; fallback to reading JSON file
        }
      }

      if (!metadata) {
        try {
          const rawMeta = fs.readFileSync(jsonPath, 'utf-8');
          metadata = JSON.parse(rawMeta);
        } catch (error) {
          metadata = null;
        }
      }

      resolve({
        radarId,
        pngPath,
        jsonPath,
        metadata,
        stdout,
        stderr
      });
    });
  });
}

module.exports = {
  processH5File
};

