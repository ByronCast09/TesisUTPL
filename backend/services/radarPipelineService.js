const pipelineConfig = require('../config/pipelineConfig');
const fileTransferService = require('./fileTransferService');
const h5ProcessingService = require('./h5ProcessingService');
const storageService = require('./pipelineStorageService');
const firebaseService = require('./firebaseService');
const pipelineState = require('./pipelineStateService');
const gifService = require('./gifService');
const { runWithConcurrency } = require('./concurrencyUtils');

function getDateFromEntry(entry) {
  return entry?.metadata?.date || (entry?.timestamp || '').slice(0, 10);
}

function getConfiguredRadars() {
  const ids = new Set();
  if (Array.isArray(pipelineConfig.radarIds)) {
    pipelineConfig.radarIds.forEach((id) => ids.add(id));
  }
  if (pipelineConfig.radars) {
    Object.keys(pipelineConfig.radars).forEach((id) => ids.add(id));
  }
  return Array.from(ids);
}

async function processRadar(radarId) {
  const state = pipelineState.getState();
  const radarState = state.radars?.[radarId] || {};
  const manualInfo = radarState.manualProcessing;
  if (manualInfo?.status === 'running') {
    const startedAtMs = new Date(manualInfo.startedAt || 0).getTime();
    const timeoutMinutes = pipelineConfig.processing?.manualTimeoutMinutes || 10;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const isExpired = Number.isFinite(startedAtMs) && (Date.now() - startedAtMs) > timeoutMs;

    if (isExpired) {
      pipelineState.updateState((current) => {
        if (current.radars?.[radarId]?.manualProcessing?.status === 'running') {
          delete current.radars[radarId].manualProcessing;
        }
        return current;
      });
    } else {
      return {
        radarId,
        status: 'skipped-manual-processing',
        manual: manualInfo
      };
    }
  }

  try {
    const fetchedBatch = await fileTransferService.fetchNewRemoteFiles(radarId);
    if (!fetchedBatch.length) {
      return { radarId, status: 'no-new-files' };
    }

    const entries = [];
    const firebaseUploads = [];
    const processedDates = new Set();
    const concurrency = pipelineConfig.processing?.maxConcurrency || 1;

    const taskResults = await runWithConcurrency(fetchedBatch, async (fetched) => {
      const processed = await h5ProcessingService.processH5File({
        radarId,
        inputPath: fetched.localPath,
        modifyTime: fetched.modifyTime
      });

      const entry = storageService.registerProcessedResult({
        radarId,
        pngPath: processed.pngPath,
        jsonPath: processed.jsonPath,
        metadata: processed.metadata,
        source: {
          remotePath: fetched.remotePath,
          h5Path: fetched.localPath,
          modifyTime: fetched.modifyTime
        }
      });

      let firebaseUpload = null;
      if (pipelineConfig.firebase.enabled) {
        try {
          firebaseUpload = await firebaseService.uploadProcessed(entry);
        } catch (firebaseError) {
          console.error(`Error subiendo a Firebase para ${radarId}:`, firebaseError.message);
        }
      }

      return { entry, firebaseUpload };
    }, concurrency);

    taskResults.forEach(({ entry, firebaseUpload }) => {
      entries.push(entry);
      const entryDate = getDateFromEntry(entry);
      if (entryDate) processedDates.add(entryDate);
      if (firebaseUpload) {
        firebaseUploads.push(firebaseUpload);
      }
    });

    const gifConcurrency = pipelineConfig.processing?.gifConcurrency || 1;
    await runWithConcurrency(
      Array.from(processedDates),
      async (date) => {
        try {
          await gifService.ensureGifForDate(radarId, date);
        } catch (gifError) {
          console.warn(`No se pudo generar GIF para ${radarId} ${date}:`, gifError.message);
        }
      },
      gifConcurrency
    );

    return {
      radarId,
      status: 'processed',
      count: entries.length,
      entries,
      firebase: firebaseUploads
    };
  } catch (error) {
    console.error(`Error procesando radar ${radarId}:`, error);
    return { radarId, status: 'error', error: error.message };
  } finally {
    storageService.cleanupLocalStorage();
  }
}

async function runCycle() {
  const radars = getConfiguredRadars();
  if (!radars.length) {
    console.warn('radarPipelineService: no hay radares configurados (RADAR_PIPELINE_RADAR_IDS o RADAR_PIPELINE_RADARS)');
    return [];
  }

  const radarConcurrency = pipelineConfig.processing?.radarConcurrency || 1;
  return runWithConcurrency(
    radars,
    (radarId) => processRadar(radarId),
    radarConcurrency
  );
}

async function processDate(radarId, targetDate) {
  const startedAt = new Date().toISOString();
  pipelineState.updateState((current) => {
    if (!current.radars) {
      current.radars = {};
    }
    current.radars[radarId] = {
      ...(current.radars[radarId] || {}),
      manualProcessing: {
        date: targetDate,
        status: 'running',
        startedAt
      }
    };
    return current;
  });

  try {
    const remoteFiles = await fileTransferService.listRemoteFilesForDate(radarId, targetDate);
    if (!remoteFiles.length) {
      return { radarId, date: targetDate, status: 'no-files' };
    }

    const entries = [];
    const firebaseUploads = [];
    const processedDates = new Set();
    let reusedCount = 0;
    const reusedEntries = [];
    const concurrency = pipelineConfig.processing?.maxConcurrency || 1;

    const toDownload = [];
    remoteFiles.forEach((file) => {
      const existing = storageService.findEntryByRemotePath(radarId, file.fullPath);
      if (existing) {
        reusedCount += 1;
        reusedEntries.push(existing);
        entries.push(existing);
        processedDates.add(targetDate);
      } else {
        toDownload.push(file);
      }
    });

    let downloadedBatch = [];
    if (toDownload.length) {
      downloadedBatch = await fileTransferService.downloadRemoteFiles(radarId, toDownload);
    }

    const taskResults = await runWithConcurrency(downloadedBatch, async (fetched) => {
      const processed = await h5ProcessingService.processH5File({
        radarId,
        inputPath: fetched.localPath,
        modifyTime: fetched.modifyTime
      });

      const entry = storageService.registerProcessedResult({
        radarId,
        pngPath: processed.pngPath,
        jsonPath: processed.jsonPath,
        metadata: processed.metadata,
        source: {
          remotePath: fetched.remotePath,
          h5Path: fetched.localPath,
          modifyTime: fetched.modifyTime
        }
      });

      let firebaseUpload = null;
      if (pipelineConfig.firebase.enabled) {
        try {
          firebaseUpload = await firebaseService.uploadProcessed(entry);
        } catch (firebaseError) {
          console.error(`Error subiendo a Firebase para ${radarId}:`, firebaseError.message);
        }
      }

      return { entry, firebaseUpload };
    }, concurrency);

    taskResults.forEach(({ entry, reused, firebaseUpload }) => {
      if (entry) {
        entries.push(entry);
        processedDates.add(targetDate);
      }
      if (firebaseUpload) {
        firebaseUploads.push(firebaseUpload);
      }
    });

    const gifConcurrency = pipelineConfig.processing?.gifConcurrency || 1;
    await runWithConcurrency(
      Array.from(processedDates),
      async (date) => {
        try {
          await gifService.ensureGifForDate(radarId, date);
        } catch (gifError) {
          console.warn(`No se pudo generar GIF para ${radarId} ${date}:`, gifError.message);
        }
      },
      gifConcurrency
    );

    return {
      radarId,
      date: targetDate,
      status: 'processed',
      count: entries.length,
      processedCount: entries.length - reusedCount,
      reusedCount,
      reused: reusedEntries,
      entries,
      firebase: firebaseUploads
    };
  } catch (error) {
    console.error(`Error procesando fecha ${targetDate} para radar ${radarId}:`, error);
    return { radarId, date: targetDate, status: 'error', error: error.message };
  } finally {
    pipelineState.updateState((current) => {
      if (!current.radars || !current.radars[radarId]) {
        return current;
      }
      const manual = current.radars[radarId].manualProcessing;
      if (manual && manual.startedAt === startedAt) {
        delete current.radars[radarId].manualProcessing;
      }
      return current;
    });
    storageService.cleanupLocalStorage();
  }
}

function getStatus() {
  const state = pipelineState.getState();
  const index = pipelineState.getIndex();
  return {
    state,
    index,
    config: {
      radars: getConfiguredRadars(),
      retentionHours: pipelineConfig.retentionHours,
      firebaseEnabled: pipelineConfig.firebase.enabled
    }
  };
}

function mergeDates(processed, remote) {
  return Array.from(new Set([...(processed || []), ...(remote || [])])).sort();
}

module.exports = {
  runCycle,
  processRadar,
  processDate,
  getStatus,
  getLatestEntry: storageService.getLatestEntry,
  getTimeline: (radarId, options) => storageService.getTimeline(radarId, options),
  getHistoricalIndex: (radarId, options) => storageService.buildHistoricalIndex(radarId, options),
  getAvailableDates: async (radarId) => {
    const processed = storageService.getAvailableDates(radarId);
    let remote = [];
    try {
      remote = await fileTransferService.listRemoteDates(radarId);
    } catch (err) {
      console.warn('No se pudieron obtener fechas remotas:', err.message);
    }
    return mergeDates(processed, remote);
  }
};

