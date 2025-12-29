const fs = require('fs');
const path = require('path');
const pipelineConfig = require('../config/pipelineConfig');
const { ensureDir, buildPublicPath } = require('../services/pipelineStorageService');
const metadataRepository = require('../services/radarMetadataRepository');

function parseJSONMaybe(value, defaultValue = null) {
  if (!value) {
    return defaultValue;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (err) {
    return defaultValue;
  }
}

function normalizeTimestamp(rawTimestamp) {
  if (!rawTimestamp) {
    return null;
  }
  const date = new Date(rawTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function buildFilename({ radarId, timestamp, originalName }) {
  const safeRadar = radarId ? radarId.replace(/[^A-Z0-9_-]/gi, '') : 'RADAR';
  const ext = path.extname(originalName || '') || '.png';
  const baseTs = timestamp ? timestamp.replace(/[^0-9]/g, '') : new Date().toISOString().replace(/[^0-9]/g, '');
  return `${safeRadar}_${baseTs}${ext}`;
}

async function persistUploadedFile({ radarId, timestamp, file }) {
  if (!file) {
    return { storagePath: null, publicUrl: null, filename: null };
  }

  const isoTs = normalizeTimestamp(timestamp) || new Date().toISOString();
  const dateSegment = isoTs.slice(0, 10);
  const targetDir = path.join(pipelineConfig.paths.processedStorageDir, radarId, dateSegment);
  ensureDir(targetDir);

  const filename = buildFilename({
    radarId,
    timestamp: isoTs,
    originalName: file.originalname,
  });

  const storagePath = path.join(targetDir, filename);
  fs.writeFileSync(storagePath, file.buffer);
  const publicUrl = buildPublicPath(storagePath);

  return { storagePath, publicUrl, filename };
}

exports.receiveProcessed = async (req, res) => {
  try {
    const {
      radarId: rawRadarId,
      productType,
      timestamp: rawTimestamp,
      metadata: metadataRaw,
      rawSource: rawSourceRaw,
      storagePath: providedStoragePath,
      publicUrl: providedPublicUrl,
      status,
      checksum,
      fileSize,
      filename: providedFilename,
    } = req.body || {};

    const radarId = (rawRadarId || '').toUpperCase();
    if (!radarId) {
      return res.status(400).json({
        success: false,
        message: 'El campo radarId es requerido',
      });
    }

    const metadata = parseJSONMaybe(metadataRaw, metadataRaw || null);
    const rawSource = parseJSONMaybe(rawSourceRaw, rawSourceRaw || null);
    const normalizedTimestamp = normalizeTimestamp(rawTimestamp) || metadata?.sourceTimestamp || metadata?.timestamp || null;

    let finalStoragePath = providedStoragePath || null;
    let finalPublicUrl = providedPublicUrl || null;
    let finalFilename = providedFilename || null;

    if (req.file) {
      const persisted = await persistUploadedFile({
        radarId,
        timestamp: normalizedTimestamp,
        file: req.file,
      });
      finalStoragePath = persisted.storagePath;
      finalPublicUrl = persisted.publicUrl;
      finalFilename = persisted.filename;
    }

    if (!finalStoragePath) {
      return res.status(400).json({
        success: false,
        message: 'Se debe proporcionar un archivo (campo file) o la ruta storagePath',
      });
    }

    const record = await metadataRepository.recordProcessedFile({
      radarId,
      productType,
      timestamp: normalizedTimestamp,
      storagePath: finalStoragePath,
      publicUrl: finalPublicUrl,
      metadata,
      rawSource,
      status,
      checksum,
      fileSize: fileSize ? Number(fileSize) : undefined,
      filename: finalFilename,
    });

    res.json({
      success: true,
      radarId,
      storedFile: req.file
        ? {
            path: finalStoragePath,
            publicUrl: finalPublicUrl,
            originalName: req.file.originalname,
          }
        : null,
      record,
    });
  } catch (error) {
    console.error('Error en ingestController.receiveProcessed:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar archivo procesado',
      error: error.message,
    });
  }
};


