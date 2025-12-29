const fs = require('fs');
const metadataRepository = require('../services/radarMetadataRepository');

exports.listRadars = async (_req, res) => {
  try {
    if (!metadataRepository) {
      return res.json({ success: true, radars: [] });
    }
    const radars = await metadataRepository.listRadars();
    res.json({ success: true, radars });
  } catch (error) {
    console.error('Error en metadataController.listRadars:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar radares',
      error: error.message,
    });
  }
};

exports.listProcessed = async (req, res) => {
  try {
    const { radarId, productType, limit, from, to } = req.query;
    const processed = await metadataRepository.listProcessed({
      radarId,
      productType,
      limit,
      from,
      to,
    });
    res.json({ success: true, results: processed });
  } catch (error) {
    console.error('Error en metadataController.listProcessed:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar productos procesados',
      error: error.message,
    });
  }
};

exports.listProcessedForRadar = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { productType, limit, from, to } = req.query;
    const processed = await metadataRepository.listProcessed({
      radarId: radarId.toUpperCase(),
      productType,
      limit,
      from,
      to,
    });
    res.json({ success: true, radarId: radarId.toUpperCase(), results: processed });
  } catch (error) {
    console.error('Error en metadataController.listProcessedForRadar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al listar productos por radar',
      error: error.message,
    });
  }
};

exports.getProcessedById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await metadataRepository.getById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el registro solicitado',
      });
    }
    res.json({ success: true, record });
  } catch (error) {
    console.error('Error en metadataController.getProcessedById:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener producto procesado',
      error: error.message,
    });
  }
};

exports.getLatestForRadar = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { productType } = req.query;
    const record = await metadataRepository.getLatest(radarId.toUpperCase(), productType);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No hay registros para este radar',
      });
    }
    res.json({ success: true, radarId: radarId.toUpperCase(), record });
  } catch (error) {
    console.error('Error en metadataController.getLatestForRadar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el último producto del radar',
      error: error.message,
    });
  }
};

exports.getAvailableDates = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { productType } = req.query;
    const dates = await metadataRepository.getAvailableDates(radarId.toUpperCase(), productType);
    res.json({ success: true, radarId: radarId.toUpperCase(), dates });
  } catch (error) {
    console.error('Error en metadataController.getAvailableDates:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener fechas disponibles',
      error: error.message,
    });
  }
};

exports.getSummary = async (_req, res) => {
  try {
    const summary = await metadataRepository.summarizeByRadar();
    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error en metadataController.getSummary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen',
      error: error.message,
    });
  }
};

exports.streamImageById = async (req, res) => {
  try {
    const { id } = req.params;
    const buffer = await metadataRepository.getImageBufferById(id);
    if (buffer && buffer.length) {
      res.setHeader('Content-Type', 'image/png');
      return res.end(buffer);
    }

    const record = await metadataRepository.getById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el registro solicitado',
      });
    }

    const filePath = record.storage_path;
    if (filePath && fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/png');
      const stream = fs.createReadStream(filePath);
      stream.on('error', (error) => {
        console.error('Error al leer PNG desde disco:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'No se pudo leer la imagen desde disco',
            error: error.message,
          });
        } else {
          res.destroy(error);
        }
      });
      return stream.pipe(res);
    }

    return res.status(404).json({
      success: false,
      message: 'Imagen no disponible ni en la base de datos ni en el sistema de archivos',
    });
  } catch (error) {
    console.error('Error en metadataController.streamImageById:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la imagen solicitada',
      error: error.message,
    });
  }
};


