const fs = require('fs');
const path = require('path');
const pipelineConfig = require('../config/pipelineConfig');
const pipelineState = require('./pipelineStateService');
const radarMetadataRepository = require('./radarMetadataRepository');

const { processedStorageDir, rawStorageDir } = pipelineConfig.paths;

function posixify(p) {
  return p.split(path.sep).join('/');
}

function buildPublicPath(absolutePath) {
  const relative = path.relative(processedStorageDir, absolutePath);
  return `/radar-images/${posixify(relative)}`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function removeIfEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  const entries = fs.readdirSync(dirPath);
  if (!entries.length) {
    fs.rmdirSync(dirPath);
  }
}

function deleteOlderThan(baseDir, cutoffMs) {
  if (!fs.existsSync(baseDir)) {
    return;
  }

  const entries = fs.readdirSync(baseDir);
  entries.forEach((entry) => {
    const fullPath = path.join(baseDir, entry);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      deleteOlderThan(fullPath, cutoffMs);
      removeIfEmpty(fullPath);
    } else if (stats.mtimeMs < cutoffMs) {
      fs.unlinkSync(fullPath);
    }
  });
}

function cleanupLocalStorage() {
  const retentionMs = pipelineConfig.retentionHours * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;
  deleteOlderThan(rawStorageDir, cutoff);
}

function registerProcessedResult({ radarId, pngPath, jsonPath, metadata, source }) {
  const timestamp = metadata?.sourceTimestamp || metadata?.timestamp || metadata?.generatedAt || new Date().toISOString();
  const entry = {
    radarId,
    timestamp,
    local: {
      png: pngPath,
      json: jsonPath,
      publicPng: buildPublicPath(pngPath),
      publicJson: buildPublicPath(jsonPath)
    },
    metadata: metadata || {},
    source: source || {}
  };

  let finalEntry = entry;

  pipelineState.updateIndex((current) => {
    if (!current.radars) {
      current.radars = {};
    }
    if (!current.radars[radarId]) {
      current.radars[radarId] = [];
    }
    const entries = current.radars[radarId];

    const remoteKey = source?.remotePath;
    if (remoteKey) {
      const existingIndex = entries.findIndex((e) => e.source?.remotePath === remoteKey);
      if (existingIndex !== -1) {
        entries[existingIndex] = entry;
        finalEntry = entry;
      } else {
        entries.push(entry);
      }
    } else {
      entries.push(entry);
    }

    // Ordenar por timestamp ascendente
    entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Eliminar duplicados por publicPng
    const deduped = [];
    const seen = new Set();
    entries.forEach((e) => {
      const key = e.local.publicPng;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(e);
      }
    });

    current.radars[radarId] = deduped;

    current.updatedAt = new Date().toISOString();
    return current;
  });

  pipelineState.updateState((current) => {
    if (!current.radars) {
      current.radars = {};
    }
    current.radars[radarId] = {
      ...(current.radars[radarId] || {}),
      lastProcessed: {
        timestamp,
        publicPng: entry.local.publicPng,
        metadata: entry.metadata
      }
    };
    return current;
  });

  if (radarMetadataRepository) {
    radarMetadataRepository.registerProcessedEntry(finalEntry).catch((err) => {
      console.error('No se pudo registrar metadata en Postgres:', err.message);
    });
  }

  return finalEntry;
}

function getLatestEntry(radarId) {
  const index = pipelineState.getIndex();
  const list = index.radars?.[radarId] || [];
  if (!list.length) {
    return null;
  }
  return list[list.length - 1];
}

function getTimeline(radarId, { limit = 288, date, from, to } = {}) {
  const index = pipelineState.getIndex();
  const list = index.radars?.[radarId] || [];
  if (!list.length) {
    return [];
  }
  let filtered = list;
  if (date) {
    filtered = filtered.filter((entry) => (entry.timestamp || '').startsWith(date));
  }
  if (from || to) {
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() : null;
    filtered = filtered.filter((entry) => {
      const ts = new Date(entry.timestamp || entry.metadata?.sourceTimestamp || 0).getTime();
      if (Number.isNaN(ts)) {
        return false;
      }
      if (fromTs !== null && ts < fromTs) {
        return false;
      }
      if (toTs !== null && ts > toTs) {
        return false;
      }
      return true;
    });
  }
  if (limit && limit > 0 && filtered.length > limit) {
    filtered = filtered.slice(filtered.length - limit);
  }
  return filtered;
}

function getAvailableDates(radarId) {
  const index = pipelineState.getIndex();
  const list = index.radars?.[radarId] || [];
  const set = new Set();
  list.forEach((entry) => {
    const date = (entry.timestamp || '').slice(0, 10);
    if (date) set.add(date);
  });
  return Array.from(set).sort();
}

function findEntryByRemotePath(radarId, remotePath) {
  if (!remotePath) {
    return null;
  }
  const index = pipelineState.getIndex();
  const list = index.radars?.[radarId] || [];
  return list.find((entry) => entry.source?.remotePath === remotePath) || null;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function summarizeRecentWindows(entries, windowHoursList = [1, 3, 6, 12, 24, 72]) {
  if (!entries.length) {
    return [];
  }
  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const latest = new Date(sorted[sorted.length - 1].timestamp || sorted[sorted.length - 1].metadata?.sourceTimestamp || 0).getTime();
  if (Number.isNaN(latest)) {
    return [];
  }
  return windowHoursList.map((hours) => {
    const cutoff = latest - hours * 60 * 60 * 1000;
    const windowEntries = sorted.filter((entry) => {
      const ts = new Date(entry.timestamp || entry.metadata?.sourceTimestamp || 0).getTime();
      return !Number.isNaN(ts) && ts >= cutoff && ts <= latest;
    });
    return {
      id: `${hours}h`,
      label: hours === 1 ? 'Última hora' : `Últimas ${hours} horas`,
      hours,
      start: new Date(cutoff).toISOString(),
      end: new Date(latest).toISOString(),
      count: windowEntries.length,
      dates: Array.from(new Set(windowEntries.map((entry) => (entry.timestamp || '').slice(0, 10)))).filter(Boolean),
      timestamps: windowEntries.map((entry) => entry.timestamp)
    };
  }).filter((window) => window.count > 0);
}

function buildHistoricalIndex(radarId, options = {}) {
  const index = pipelineState.getIndex();
  const entries = index.radars?.[radarId] || [];
  const tree = {};
  const seenDates = new Set();

  entries.forEach((entry) => {
    const dateStr = (entry.timestamp || entry.metadata?.sourceTimestamp || '').slice(0, 10);
    if (!dateStr || seenDates.has(dateStr)) {
      if (dateStr) seenDates.add(dateStr);
      return;
    }
    seenDates.add(dateStr);
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    if (!yearStr || !monthStr || !dayStr) {
      return;
    }
    if (!tree[yearStr]) {
      tree[yearStr] = {
        year: Number(yearStr),
        months: {}
      };
    }
    const monthKey = monthStr;
    const monthIndex = Number(monthStr) - 1;
    if (!tree[yearStr].months[monthKey]) {
      tree[yearStr].months[monthKey] = {
        month: Number(monthStr),
        monthName: MONTH_NAMES[monthIndex] || monthStr,
        dates: []
      };
    }
    tree[yearStr].months[monthKey].dates.push({
      date: dateStr,
      day: Number(dayStr)
    });
  });

  const years = Object.values(tree)
    .sort((a, b) => a.year - b.year)
    .map((yearEntry) => {
      const months = Object.values(yearEntry.months)
        .sort((a, b) => a.month - b.month)
        .map((monthEntry) => ({
          ...monthEntry,
          dates: monthEntry.dates.sort((a, b) => a.day - b.day)
        }));
      return {
        year: yearEntry.year,
        months
      };
    });

  const categories = [
    {
      id: 'radar',
      label: 'Radar',
      description: 'Imágenes de reflectividad procesadas por fecha',
      years
    }
  ];

  const recentWindows = summarizeRecentWindows(entries, options.windows || undefined);

  return {
    radarId,
    categories,
    recentWindows,
    totalDates: seenDates.size
  };
}

module.exports = {
  cleanupLocalStorage,
  registerProcessedResult,
  getLatestEntry,
  getTimeline,
  getAvailableDates,
  findEntryByRemotePath,
  buildHistoricalIndex,
  ensureDir,
  buildPublicPath
};

