const path = require('path');

const DEFAULT_RETENTION_HOURS = 24;
const MINIMUM_RETENTION_HOURS = Number(process.env.RADAR_PIPELINE_MIN_RETENTION_HOURS || 720);
const DEFAULT_CRON = '*/5 * * * *';

function parseRadarsConfig(rawValue) {
  /**
   * Permite configurar múltiples radares mediante la variable de entorno
   * RADAR_PIPELINE_RADARS con el formato:
   *   RADAR_ID:/ruta/remota;OTRO_RADAR:/otra/ruta
   */
  if (!rawValue) {
    return null;
  }

  return rawValue.split(';').reduce((acc, item) => {
    const trimmed = item.trim();
    if (!trimmed) {
      return acc;
    }
    const sepIndex = trimmed.indexOf(':');
    if (sepIndex === -1) {
      return acc;
    }
    const id = trimmed.slice(0, sepIndex);
    const value = trimmed.slice(sepIndex + 1);
    if (id && value) {
      acc[id.trim().toUpperCase()] = value.trim();
    }
    return acc;
  }, {});
}

function parseBoundsConfig(rawValue) {
  /**
   * Formato esperado:
   *   RADAR_ID:latMin,latMax,lonMin,lonMax;OTRO:...
   */
  if (!rawValue) {
    return null;
  }
  return rawValue.split(';').reduce((acc, item) => {
    const trimmed = item.trim();
    if (!trimmed) {
      return acc;
    }
    const [id, rest] = trimmed.split(':');
    if (!id || !rest) {
      return acc;
    }
    const parts = rest.split(',').map(Number);
    if (parts.length === 4 && parts.every((value) => !Number.isNaN(value))) {
      acc[id.trim().toUpperCase()] = {
        latMin: parts[0],
        latMax: parts[1],
        lonMin: parts[2],
        lonMax: parts[3]
      };
    }
    return acc;
  }, {});
}

function resolveBoolean(envValue, defaultValue = false) {
  if (envValue === undefined) {
    return defaultValue;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(envValue).toLowerCase());
}

const rootDir = path.resolve(__dirname, '..');

const rawStorageDir = process.env.RADAR_PIPELINE_RAW_DIR ||
  path.join(rootDir, 'storage', 'raw');

const processedStorageDir = process.env.RADAR_PIPELINE_PROCESSED_DIR ||
  path.join(rootDir, 'public', 'radar-images');

const indexStoragePath = process.env.RADAR_PIPELINE_INDEX_PATH ||
  path.join(rootDir, 'storage', 'pipeline-index.json');

const stateStoragePath = process.env.RADAR_PIPELINE_STATE_PATH ||
  path.join(rootDir, 'storage', 'pipeline-state.json');

const pipelineConfig = {
  cron: process.env.RADAR_PIPELINE_CRON || DEFAULT_CRON,
  retentionHours: (() => {
    const requested = Number(process.env.RADAR_PIPELINE_RETENTION_HOURS || DEFAULT_RETENTION_HOURS);
    if (Number.isNaN(requested) || requested <= 0) {
      return MINIMUM_RETENTION_HOURS;
    }
    return Math.max(requested, MINIMUM_RETENTION_HOURS);
  })(),
  pythonBin: process.env.RADAR_PIPELINE_PYTHON || process.env.PYTHON_CMD || 'python',
  remote: {
    host: process.env.RADAR_PIPELINE_REMOTE_HOST,
    port: Number(process.env.RADAR_PIPELINE_REMOTE_PORT || 22),
    username: process.env.RADAR_PIPELINE_REMOTE_USER,
    password: process.env.RADAR_PIPELINE_REMOTE_PASSWORD,
    privateKeyPath: process.env.RADAR_PIPELINE_REMOTE_KEY_PATH,
    passphrase: process.env.RADAR_PIPELINE_REMOTE_KEY_PASSPHRASE,
    baseDir: process.env.RADAR_PIPELINE_REMOTE_BASE_DIR
  },
  radars: parseRadarsConfig(process.env.RADAR_PIPELINE_RADARS),
  radarIds: (() => {
    if (process.env.RADAR_PIPELINE_RADAR_IDS) {
      return process.env.RADAR_PIPELINE_RADAR_IDS.split(',').map((id) => id.trim().toUpperCase()).filter(Boolean);
    }
    const radarsMap = parseRadarsConfig(process.env.RADAR_PIPELINE_RADARS);
    if (radarsMap) {
      return Object.keys(radarsMap);
    }
    return [];
  })(),
  datasets: {
    // Permite especificar variable/dataset para cada radar usando
    // RADAR_PIPELINE_DATASETS=LGUAXX:reflectivity;LOXX:rain_rate
    ...(parseRadarsConfig(process.env.RADAR_PIPELINE_DATASETS) || {})
  },
  bounds: {
    global: (() => {
      const raw = process.env.RADAR_PIPELINE_DEFAULT_BOUNDS;
      if (!raw) {
        return null;
      }
      const [latMin, latMax, lonMin, lonMax] = raw.split(',').map(Number);
      if ([latMin, latMax, lonMin, lonMax].some((value) => Number.isNaN(value))) {
        return null;
      }
      return { latMin, latMax, lonMin, lonMax };
    })(),
    perRadar: parseBoundsConfig(process.env.RADAR_PIPELINE_BOUNDS_PER_RADAR)
  },
  processing: {
    transparentBelow: (() => {
      const raw = process.env.RADAR_PIPELINE_TRANSPARENT_BELOW;
      if (raw === undefined) {
        return 0;
      }
      const value = Number(raw);
      return Number.isNaN(value) ? 0 : value;
    })(),
    vmin: (() => {
      const raw = process.env.RADAR_PIPELINE_VMIN;
      if (raw === undefined) {
        return 0;
      }
      const value = Number(raw);
      return Number.isNaN(value) ? 0 : value;
    })(),
    vmax: (() => {
      const raw = process.env.RADAR_PIPELINE_VMAX;
      if (raw === undefined) {
        return 60;
      }
      const value = Number(raw);
      return Number.isNaN(value) ? 60 : value;
    })(),
    cmap: process.env.RADAR_PIPELINE_COLORMAP || 'turbo',
    maxConcurrency: (() => {
      const value = Number(process.env.RADAR_PIPELINE_MAX_CONCURRENCY || 4);
      if (Number.isNaN(value) || value <= 0) {
        return 1;
      }
      return Math.min(Math.max(1, Math.floor(value)), 8);
    })(),
    downloadConcurrency: (() => {
      const value = Number(
        process.env.RADAR_PIPELINE_DOWNLOAD_CONCURRENCY ||
        process.env.RADAR_PIPELINE_MAX_CONCURRENCY ||
        3
      );
      if (Number.isNaN(value) || value <= 0) {
        return 1;
      }
      return Math.min(Math.max(1, Math.floor(value)), 8);
    })(),
    gifConcurrency: (() => {
      const value = Number(process.env.RADAR_PIPELINE_GIF_CONCURRENCY || 2);
      if (Number.isNaN(value) || value <= 0) {
        return 1;
      }
      return Math.min(Math.max(1, Math.floor(value)), 6);
    })(),
    radarConcurrency: (() => {
      const value = Number(process.env.RADAR_PIPELINE_RADAR_CONCURRENCY || 2);
      if (Number.isNaN(value) || value <= 0) {
        return 1;
      }
      return Math.min(Math.max(1, Math.floor(value)), 4);
    })(),
    manualTimeoutMinutes: (() => {
      const value = Number(process.env.RADAR_PIPELINE_MANUAL_TIMEOUT_MINUTES || 10);
      if (Number.isNaN(value) || value <= 0) {
        return 10;
      }
      return Math.min(Math.floor(value), 60);
    })()
  },
  paths: {
    rootDir,
    rawStorageDir,
    processedStorageDir,
    indexStoragePath,
    stateStoragePath
  },
  firebase: {
    enabled: resolveBoolean(process.env.RADAR_PIPELINE_FIREBASE_ENABLED, false),
    bucket: process.env.FIREBASE_STORAGE_BUCKET,
    credentialsPath: process.env.FIREBASE_SERVICE_ACCOUNT,
    credentialsBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
    storagePrefix: process.env.RADAR_PIPELINE_FIREBASE_PREFIX || 'radar',
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    uploadOriginals: resolveBoolean(process.env.RADAR_PIPELINE_FIREBASE_UPLOAD_H5, false)
  }
};

module.exports = pipelineConfig;

