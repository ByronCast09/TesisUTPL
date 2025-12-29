const radarService = require('../services/radarService');
const cloudService = require('../services/cloudService');
const localRadarService = require('../services/localRadarService');
const remoteRadarService = require('../services/remoteRadarService');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const gifService = require('../services/gifService');
const radarPipelineService = require('../services/radarPipelineService');
const pngDownloadService = require('../services/pngDownloadService');
const radarMetadataRepository = require('../services/radarMetadataRepository');

/**
 * Obtiene los datos actuales de ambos radares
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getCurrentRadarData = async (req, res) => {
  try {
    let lguaxxData, loxxData;

    // Intentar obtener datos desde la PC remota primero
    try {
      const isRemoteConnected = await tailscaleService.checkRemoteConnection();

      if (isRemoteConnected) {
        console.log('Conexión con PC remota establecida, obteniendo datos en tiempo real...');
        const remoteData = await tailscaleService.getRemoteRadarData();
        lguaxxData = remoteData.LGUAXX;
        loxxData = remoteData.LOXX;

        // Sincronizar datos con Google Cloud
        await tailscaleService.syncRadarData('LGUAXX');
        await tailscaleService.syncRadarData('LOXX');
      } else {
        console.log('PC remota no disponible, usando datos almacenados...');
        lguaxxData = await radarService.downloadAndProcessRadarData('LGUAXX');
        loxxData = await radarService.downloadAndProcessRadarData('LOXX');
      }
    } catch (remoteError) {
      console.error('Error al conectar con PC remota:', remoteError);
      lguaxxData = await radarService.downloadAndProcessRadarData('LGUAXX');
      loxxData = await radarService.downloadAndProcessRadarData('LOXX');
    }

    // Obtener URLs de WMS para ambos radares
    const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
    const lguaxxWmsUrl = cloudService.getWmsUrl('LGUAXX', timestamp);
    const loxxWmsUrl = cloudService.getWmsUrl('LOXX', timestamp);

    res.json({
      success: true,
      data: {
        LGUAXX: {
          ...lguaxxData,
          wmsUrl: lguaxxWmsUrl
        },
        LOXX: {
          ...loxxData,
          wmsUrl: loxxWmsUrl
        }
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error al obtener datos actuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos de radar',
      error: error.message
    });
  }
};

/**
 * Obtiene datos históricos por fecha
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getHistoricalData = async (req, res) => {
  try {
    const { date } = req.params;
    const { radar = 'all' } = req.query;

    // Validar formato de fecha (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de fecha no válido. Use YYYY-MM-DD'
      });
    }

    const data = await cloudService.getHistoricalData(date, radar);

    res.json({
      success: true,
      data,
      date
    });
  } catch (error) {
    console.error('Error al obtener datos históricos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos históricos',
      error: error.message
    });
  }
};

/**
 * Obtiene datos específicos de un radar
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getRadarData = async (req, res) => {
  try {
    const { radarId } = req.params;

    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX'
      });
    }

    const data = await radarService.downloadAndProcessRadarData(radarId.toUpperCase());

    // Obtener URL de WMS para el radar
    const timestamp = new Date().toISOString().replace(/[:.]/g, '_');
    const wmsUrl = cloudService.getWmsUrl(radarId.toUpperCase(), timestamp);

    res.json({
      success: true,
      data: {
        ...data,
        wmsUrl
      },
      radar: radarId.toUpperCase(),
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Error al obtener datos del radar ${req.params.radarId}:`, error);
    res.status(500).json({
      success: false,
      message: `Error al obtener datos del radar ${req.params.radarId}`,
      error: error.message
    });
  }
};

/**
 * Obtiene la URL de WMS para un radar específico
 * @param {Object} req - Objeto de solicitud
 * @param {Object} res - Objeto de respuesta
 */
exports.getWmsUrl = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { timestamp } = req.query;

    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX'
      });
    }

    const wmsUrl = cloudService.getWmsUrl(radarId.toUpperCase(), timestamp || new Date().toISOString().replace(/[:.]/g, '_'));

    res.json({
      success: true,
      wmsUrl,
      radar: radarId.toUpperCase(),
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Error al obtener URL de WMS para el radar ${req.params.radarId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener URL de WMS',
      error: error.message
    });
  }
};

exports.getLatestLocalWms = async (req, res) => {
  try {
    const { radarId } = req.params;
    const validId = (radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    let wmsInfo;

    try {
      // Intentar acceso directo a archivos locales primero
      wmsInfo = await localRadarService.getLatestWmsFromLocal(validId);
      console.log(`Datos obtenidos desde archivos locales para ${validId}`);
    } catch (localError) {
      console.log(`Acceso local falló para ${validId}, intentando URL remota:`, localError.message);

      // Fallback: usar servicio remoto HTTP
      wmsInfo = await remoteRadarService.getLatestWmsFromRemote(validId);
      console.log(`Datos obtenidos desde URL remota para ${validId}`);
    }

    return res.json({
      success: true,
      radar: validId,
      baseUrl: wmsInfo.baseUrl,
      layerName: wmsInfo.layerName,
      timestamp: wmsInfo.timestamp,
      fileName: wmsInfo.fileName || 'unknown'
    });
  } catch (error) {
    console.error('Error al obtener WMS más reciente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener WMS desde fuentes locales y remotas',
      error: error.message
    });
  }
};

exports.getRemoteIndex = async (req, res) => {
  try {
    const { radarId } = req.params;
    const validId = (radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    const index = await remoteRadarService.listAllRemoteFiles(validId);
    return res.json({ success: true, radar: validId, index });
  } catch (error) {
    console.error('Error al listar archivos remotos:', error);
    if (typeof error?.message === 'string' && /RADAR_[A-Z]+_URL/.test(error.message)) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'missing_remote_config'
      });
    }
    return res.status(500).json({ success: false, message: 'Error al listar archivos remotos', error: error.message });
  }
};

exports.proxyRemoteImage = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { url, date, file } = req.query;
    const validId = (radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    let targetUrl = url;
    if (!targetUrl && date && file) {
      targetUrl = remoteRadarService.buildUrlFromDateFile(validId, date, file);
    }
    if (!targetUrl) {
      return res.status(400).json({ success: false, message: 'Debe proporcionar ?url=... o ?date=YYYY-MM-DD&file=archivo.png' });
    }
    const axios = require('axios');
    const response = await axios.get(targetUrl, { responseType: 'stream', timeout: 30000 });
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
    response.data.pipe(res);
  } catch (error) {
    console.error('Error al proxyear imagen remota:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener imagen remota', error: error.message });
  }
};

exports.getRemoteWmsByQuery = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { date, file } = req.query;
    const validId = (radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    let wmsInfo;
    if (date && file) {
      const fileUrl = remoteRadarService.buildUrlFromDateFile(validId, date, file);
      const axios = require('axios');
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const resp = await axios({ method: 'GET', url: fileUrl, responseType: 'arraybuffer', timeout: 30000 });
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, file);
      fs.writeFileSync(tempFilePath, Buffer.from(resp.data));
      const cloudService = require('../services/cloudService');
      const layerName = file.replace(/\.(nc4|nc)$/i, '').replace(/[^a-zA-Z0-9]/g, '_');
      await cloudService.uploadFile(tempFilePath, `radars/${validId}/${file}`);
      wmsInfo = { baseUrl: process.env.GEOSERVER_WMS_URL, layerName, timestamp: new Date().toISOString(), fileName: file };
      try { fs.unlinkSync(tempFilePath); } catch (_) { }
    } else {
      wmsInfo = await remoteRadarService.getLatestWmsFromRemote(validId);
    }

    return res.json({ success: true, radar: validId, baseUrl: wmsInfo.baseUrl, layerName: wmsInfo.layerName, timestamp: wmsInfo.timestamp });
  } catch (error) {
    console.error('Error al obtener WMS remoto para fecha/archivo:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener WMS remoto', error: error.message });
  }
};

exports.getLatestGif = async (req, res) => {
  try {
    const { radarId } = req.params;
    const validId = (radarId || '').toUpperCase();

    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX'
      });
    }

    // Usar la nueva función específica para GIFs
    const latestGif = await remoteRadarService.getLatestRemoteGif(validId);

    if (!latestGif) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron GIFs recientes'
      });
    }

    return res.json({
      success: true,
      radar: validId,
      gif: {
        date: latestGif.date,
        file: latestGif.file,
        url: latestGif.url
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener GIF más reciente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

exports.getGifByDate = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro date es requerido'
      });
    }

    // Usar la nueva función específica para GIFs por fecha
    const gifs = await remoteRadarService.getRemoteGifsByDate(radarId, date);

    if (gifs.length === 0) {
      return res.json({
        success: false,
        message: `No se encontraron GIFs para la fecha ${date}`
      });
    }

    res.json({
      success: true,
      date: date,
      gifs: gifs.map(gif => ({
        file: gif.name,
        url: gif.url
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error al obtener GIFs por fecha:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

exports.getRemoteGifIndex = async (req, res) => {
  try {
    const { radarId } = req.params;
    const validId = (radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    const gifIndex = await remoteRadarService.listAllRemoteGifs(validId);
    // Devolver solo fechas con GIFs
    return res.json({ success: true, radar: validId, index: gifIndex });
  } catch (error) {
    console.error('Error al listar GIFs remotos:', error);
    return res.status(500).json({ success: false, message: 'Error al listar GIFs remotos', error: error.message });
  }
};

// Nueva ruta: convertir el último NetCDF remoto y servir el PNG resultante
exports.convertAndServeLatest = async (req, res) => {
  try {
    const { radarId } = req.params;
    const validId = (radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(validId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    // Descargar el último .nc/.nc4 remoto a /tmp
    const tempNcPath = await remoteRadarService.downloadLatestNcToTemp(validId);
    if (!tempNcPath || !fs.existsSync(tempNcPath)) {
      throw new Error('No se pudo descargar el archivo NetCDF remoto');
    }

    // Crear directorio de salida temporal para PNG
    const outRoot = path.join(os.tmpdir(), `radar_pngs_${Date.now()}`);
    fs.mkdirSync(outRoot, { recursive: true });

    // Ejecutar script Python para convertir a PNG
    const scriptPath = path.resolve(__dirname, '..', '..', 'scripts', 'generate_png_from_nc4.py');
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const args = [scriptPath, '--input', tempNcPath, '--radar', validId, '--out-root', outRoot];

    const proc = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const exitCode = await new Promise((resolve) => {
      proc.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error('Error al ejecutar script Python:', stderr);
      return res.status(500).json({ success: false, message: 'Error al convertir NetCDF a PNG', error: stderr || stdout });
    }

    // Intentar extraer la ruta del PNG desde la salida del script (línea que comienza con "  PNG:")
    const pngMatch = stdout.split(/\r?\n/).find((l) => l.trim().startsWith('PNG:'));
    let pngPath = null;
    if (pngMatch) {
      pngPath = pngMatch.split('PNG:')[1].trim();
    } else {
      // Buscar archivos .png en outRoot
      const files = fs.readdirSync(outRoot);
      const pngs = files.filter((f) => f.toLowerCase().endsWith('.png'));
      if (pngs.length > 0) {
        pngPath = path.join(outRoot, pngs[0]);
      }
    }

    if (!pngPath || !fs.existsSync(pngPath)) {
      console.error('No se encontró PNG generado. stdout:', stdout, 'stderr:', stderr);
      return res.status(500).json({ success: false, message: 'PNG no generado por el script' });
    }

    res.setHeader('Content-Type', 'image/png');

    const stream = fs.createReadStream(pngPath);
    stream.pipe(res);

    // Limpieza cuando termine
    stream.on('close', () => {
      try { fs.unlinkSync(pngPath); } catch (e) { }
      try { fs.unlinkSync(tempNcPath); } catch (e) { }
      try { fs.rmdirSync(outRoot, { recursive: true }); } catch (e) { }
    });

  } catch (error) {
    console.error('Error en convertAndServeLatest:', error);
    return res.status(500).json({ success: false, message: 'Error interno al convertir y servir PNG', error: error.message });
  }
};

exports.getPipelineStatus = (req, res) => {
  try {
    const status = radarPipelineService.getStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo estado del pipeline', error: error.message });
  }
};

exports.triggerPipelineRun = async (req, res) => {
  try {
    const results = await radarPipelineService.runCycle();
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error ejecutando pipeline', error: error.message });
  }
};

exports.getLatestImage = (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    const entry = radarPipelineService.getLatestEntry(radarId);
    if (!entry) {
      return res.status(404).json({ success: false, message: `No hay imágenes disponibles para ${radarId}` });
    }
    return res.json({ success: true, radar: radarId, entry });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error obteniendo última imagen', error: error.message });
  }
};

exports.getTimeline = (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    const limitRaw = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
    const date = req.query.date ? String(req.query.date) : undefined;
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const options = {};
    if (limitRaw !== undefined && !Number.isNaN(limitRaw)) {
      options.limit = limitRaw;
    }
    if (date) {
      options.date = date;
    }
    if (from) {
      options.from = from;
    }
    if (to) {
      options.to = to;
    }
    const timeline = radarPipelineService.getTimeline(radarId, options);
    return res.json({ success: true, radar: radarId, timeline });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error obteniendo timeline', error: error.message });
  }
};

exports.getAvailableDates = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    const dates = await radarPipelineService.getAvailableDates(radarId);
    return res.json({ success: true, radar: radarId, dates });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error obteniendo fechas disponibles', error: error.message });
  }
};

exports.processDate = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    const date = req.body?.date || req.query?.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Parámetro date (YYYY-MM-DD) es requerido' });
    }
    const result = await radarPipelineService.processDate(radarId, date);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error procesando fecha solicitada', error: error.message });
  }
};

exports.getDailyGif = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Parámetro date (YYYY-MM-DD) es requerido' });
    }
    const gifInfo = await gifService.ensureGifForDate(radarId, date);
    if (!gifInfo) {
      return res.status(404).json({ success: false, message: 'No hay GIF disponible para la fecha solicitada' });
    }
    return res.json({ success: true, radar: radarId, date, gif: gifInfo });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error generando GIF diario', error: error.message });
  }
};

exports.getHistoricalIndex = (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }
    const options = {};
    if (req.query.windows) {
      const parsed = req.query.windows.split(',').map((value) => Number(value.trim())).filter((value) => !Number.isNaN(value) && value > 0);
      if (parsed.length) {
        options.windows = parsed;
      }
    }
    const index = radarPipelineService.getHistoricalIndex(radarId, options);
    return res.json({ success: true, radar: radarId, index });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error obteniendo índice histórico', error: error.message });
  }
};

// ========== NUEVOS ENDPOINTS PARA PNGs EN POSTGRESQL ==========

/**
 * Descarga y guarda PNGs de una fecha específica en PostgreSQL
 */
exports.downloadPngsForDate = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Parámetro date (YYYY-MM-DD) es requerido' });
    }

    const results = await pngDownloadService.downloadPngsForDate(radarId, date);

    return res.json({
      success: true,
      radar: radarId,
      date,
      results,
    });
  } catch (error) {
    console.error('Error al descargar PNGs para fecha:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al descargar PNGs para la fecha especificada',
      error: error.message,
    });
  }
};

/**
 * Descarga todos los PNGs nuevos de un radar
 */
exports.downloadAllNewPngs = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    const results = await pngDownloadService.downloadAllNewPngs(radarId);

    return res.json({
      success: true,
      radar: radarId,
      results,
    });
  } catch (error) {
    console.error('Error al descargar todos los PNGs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al descargar todos los PNGs',
      error: error.message,
    });
  }
};

/**
 * Descarga PNGs de los últimos N días
 */
exports.downloadRecentPngs = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    const days = Number(req.query.days) || 7;
    if (days < 1 || days > 365) {
      return res.status(400).json({ success: false, message: 'El parámetro days debe estar entre 1 y 365' });
    }

    const results = await pngDownloadService.downloadRecentPngs(radarId, days);

    return res.json({
      success: true,
      radar: radarId,
      days,
      results,
    });
  } catch (error) {
    console.error('Error al descargar PNGs recientes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al descargar PNGs recientes',
      error: error.message,
    });
  }
};

/**
 * Obtiene PNGs desde PostgreSQL por fecha
 */
exports.getPngsFromDb = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    const { date, limit = 10000 } = req.query;

    const options = {
      radarId,
      productType: 'ppi_png',
      limit: Number(limit),
    };

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      options.from = new Date(`${date}T00:00:00Z`);
      options.to = new Date(`${date}T23:59:59Z`);
    }

    const pngs = await radarMetadataRepository.listProcessed(options);

    return res.json({
      success: true,
      radar: radarId,
      count: pngs.length,
      pngs: pngs.map(png => ({
        id: png.id,
        filename: png.filename,
        url: `${req.protocol}://${req.get('host')}/api/radar/pngs/${png.id}/image`,
        sourceTimestamp: png.source_timestamp,
        processedAt: png.processed_at,
        fileSize: png.file_size,
        hasImageData: !!png.png_data,
        metadata: png.metadata,
      })),
    });
  } catch (error) {
    console.error('Error al obtener PNGs desde BD:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener PNGs desde la base de datos',
      error: error.message,
    });
  }
};

/**
 * Obtiene una imagen PNG específica desde PostgreSQL
 * Usa caché en disco para mejorar rendimiento
 */
exports.getPngImageFromDb = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ success: false, message: 'ID de imagen no válido' });
    }

    const imageId = Number(id);

    // Intentar obtener desde caché primero
    const imageCacheService = require('../services/imageCacheService');
    const cachedImage = await imageCacheService.get(imageId, `img_${imageId}`);

    if (cachedImage) {
      // Servir desde caché (mucho más rápido)
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', cachedImage.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cachedImage);
    }

    // Si no está en caché, obtener de PostgreSQL
    const imageBuffer = await radarMetadataRepository.getImageBufferById(imageId);

    if (!imageBuffer) {
      return res.status(404).json({ success: false, message: 'Imagen no encontrada en la base de datos' });
    }

    // Guardar en caché para próximas peticiones (async, no bloqueante)
    imageCacheService.set(imageId, `img_${imageId}`, imageBuffer).catch(err => {
      console.error('[Cache] Error guardando imagen:', err.message);
    });

    // Configurar headers para PNG con transparencia
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS para imágenes
    res.setHeader('X-Cache', 'MISS');

    // Enviar el buffer directamente
    return res.send(imageBuffer);
  } catch (error) {
    console.error('Error al obtener imagen PNG desde BD:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener imagen desde la base de datos',
      error: error.message,
    });
  }
};

/**
 * Obtiene el índice de PNGs almacenados en PostgreSQL (formato compatible con visor)
 */
exports.getPngIndexFromDb = async (req, res) => {
  try {
    const radarId = (req.params.radarId || '').toUpperCase();
    if (!['LGUAXX', 'LGUAYY', 'LGUAZZ', 'LOXX'].includes(radarId)) {
      return res.status(400).json({ success: false, message: 'ID de radar no válido. Use LGUAXX, LGUAYY, LGUAZZ o LOXX' });
    }

    const dates = await radarMetadataRepository.getAvailableDates(radarId, 'ppi_png');

    const index = [];
    for (const date of dates) {
      const pngs = await radarMetadataRepository.listProcessed({
        radarId,
        productType: 'ppi_png',
        from: new Date(`${date}T00:00:00Z`),
        to: new Date(`${date}T23:59:59Z`),
      });

      index.push({
        date,
        png: pngs.map(png => ({
          name: png.filename,
          id: png.id,
          timestamp: png.source_timestamp,
          size: png.file_size,
          // URL para acceder a la imagen desde PostgreSQL
          url: `${req.protocol}://${req.get('host')}/api/radar/pngs/${png.id}/image`,
        })),
      });
    }

    return res.json({
      success: true,
      radar: radarId,
      index,
    });
  } catch (error) {
    console.error('Error al obtener índice de PNGs desde BD:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener índice desde la base de datos',
      error: error.message,
    });
  }
};

/**
 * Obtiene la última imagen procesada del día actual (o fecha especificada)
 */
exports.getLatestImageToday = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { date } = req.query;

    // Usar fecha proporcionada o fecha actual
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Obtener PNGs del día especificado
    const pngs = await radarMetadataRepository.listProcessed({
      radarId: radarId.toUpperCase(),
      productType: 'ppi_png',
      from: new Date(`${targetDate}T00:00:00Z`),
      to: new Date(`${targetDate}T23:59:59Z`),
      limit: 10000,
    });

    if (!pngs || pngs.length === 0) {
      return res.json({
        success: false,
        message: `No hay imágenes procesadas para ${targetDate}`,
        date: targetDate,
        radar: radarId
      });
    }

    // Filtrar solo PNGs con datos de imagen
    const pngsConImagen = pngs.filter(png => {
      return png.png_data != null &&
        png.png_data !== undefined &&
        (Buffer.isBuffer(png.png_data) ? png.png_data.length > 0 : true);
    });

    if (pngsConImagen.length === 0) {
      return res.json({
        success: false,
        message: `No hay imágenes con datos para ${targetDate}`,
        date: targetDate,
        radar: radarId
      });
    }

    // Ordenar por timestamp descendente y tomar la más reciente
    const sortedPngs = pngsConImagen.sort((a, b) => {
      const tsA = a.source_timestamp ? new Date(a.source_timestamp).getTime() : 0;
      const tsB = b.source_timestamp ? new Date(b.source_timestamp).getTime() : 0;
      return tsB - tsA;
    });

    const latestPng = sortedPngs[0];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Extraer bounds del metadata
    let bounds = null;
    if (latestPng.metadata) {
      const meta = typeof latestPng.metadata === 'string'
        ? JSON.parse(latestPng.metadata)
        : latestPng.metadata;
      bounds = meta.bounds || meta.metadata?.bounds || null;
    }

    return res.json({
      success: true,
      radar: radarId,
      date: targetDate,
      image: {
        id: latestPng.id,
        filename: latestPng.filename,
        url: `${baseUrl}/api/radar/pngs/${latestPng.id}/image`,
        timestamp: latestPng.source_timestamp ? new Date(latestPng.source_timestamp).toISOString() : null,
        metadata: latestPng.metadata || {},
        bounds: bounds
      }
    });
  } catch (error) {
    console.error('Error al obtener última imagen del día:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener última imagen del día',
      error: error.message,
    });
  }
};

/**
 * Obtiene índice de PNGs organizados por fecha para el Visor
 * GET /api/radar/:radarId/pngs/viewer-index
 */
exports.getPngIndexForViewer = async (req, res) => {
  try {
    const { radarId } = req.params;

    // Obtener todos los productos PNG del radar
    const products = await radarMetadataRepository.listProcessed({
      radarId: radarId.toUpperCase(),
      productType: 'ppi_png',
      limit: 15000  // Alto para cubrir días completos con timezone Ecuador
    });

    if (!products || products.length === 0) {
      return res.json({
        success: true,
        radar: radarId,
        dates: [],
        index: {},
        source: 'postgresql'
      });
    }

    // Agrupar por fecha
    const indexByDate = {};
    const allDates = new Set();

    // Usar moment-timezone para conversión confiable
    const moment = require('moment-timezone');

    products.forEach(product => {
      // Convertir timestamp UTC a fecha Ecuador usando moment-timezone
      // IMPORTANTE: Usar moment.utc() porque PostgreSQL devuelve timestamps en UTC
      const date = moment.utc(product.source_timestamp)
        .tz('America/Guayaquil')  // Timezone oficial de Ecuador
        .format('YYYY-MM-DD');

      allDates.add(date);

      if (!indexByDate[date]) {
        indexByDate[date] = [];
      }

      indexByDate[date].push({
        filename: product.filename,
        url: `/api/radar/pngs/${product.id}/image`,
        timestamp: product.source_timestamp.toISOString(),
        bounds: product.metadata?.bounds || null,
        metadata: product.metadata || null
      });
    });

    // Ordenar frames de cada fecha por timestamp
    Object.keys(indexByDate).forEach(date => {
      indexByDate[date].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    const dates = Array.from(allDates).sort();

    // Organizar en formato compatible con Visor
    const radarIndex = {};
    radarIndex[radarId.toUpperCase()] = indexByDate;

    // Si se especificó una fecha en query, devolver frames de esa fecha
    const requestedDate = req.query.date;
    let framesForDate = [];

    if (requestedDate && indexByDate[requestedDate]) {
      framesForDate = indexByDate[requestedDate];
    } else if (dates.length > 0) {
      // Si no se especificó fecha, devolver frames del día más reciente
      const latestDate = dates[dates.length - 1];
      framesForDate = indexByDate[latestDate] || [];
    }

    return res.json({
      success: true,
      radar: radarId,
      dates,
      index: radarIndex,
      frames: framesForDate,  // Para compatibilidad con frontend
      source: 'postgresql'
    });
  } catch (error) {
    console.error('Error al obtener viewer PNG index:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener índice de viewer',
      error: error.message
    });
  }
};

/**
 * Sirve imagen PNG por filename desde la base de datos
 */
exports.getPngImageByFilename = async (req, res) => {
  try {
    const { radarId, date, filename } = req.params;

    if (!radarId || !date || !filename) {
      return res.status(400).json({ success: false, message: 'Parámetros inválidos' });
    }

    // Buscar imagen por filename
    const image = await radarMetadataRepository.findByFilename(radarId.toUpperCase(), filename);

    if (!image || !image.image_data) {
      return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
    }

    // Configurar headers para PNG con transparencia
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', image.image_data.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
    res.setHeader('Access-Control-Allow-Origin', '*'); // CORS para imágenes

    // Enviar el buffer directamente
    return res.send(image.image_data);
  } catch (error) {
    console.error('Error al obtener imagen PNG por filename:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener imagen',
      error: error.message
    });
  }
};

/**
 * Obtiene índice de PNGs organizados por fecha para el Visor
 * GET /api/radar/:radarId/pngs/viewer-index
 */
exports.getPngIndexForViewer = async (req, res) => {
  try {
    const { radarId } = req.params;
    const { date } = req.query; // NUEVO: obtener fecha del query

    // Obtener todos los productos PNG del radar
    const products = await radarMetadataRepository.listProcessed({
      radarId: radarId.toUpperCase(),
      productType: 'ppi_png'
    });

    if (!products || products.length === 0) {
      return res.json({
        success: true,
        radar: radarId,
        dates: [],
        frames: [], // Para compatibilidad con VisorNuevo
        index: {},
        source: 'postgresql'
      });
    }

    // Agrupar por fecha
    const indexByDate = {};
    const allDates = new Set();

    products.forEach(product => {
      const productDate = product.source_timestamp.toISOString().split('T')[0];
      allDates.add(productDate);

      if (!indexByDate[productDate]) {
        indexByDate[productDate] = [];
      }


      // Usar endpoint de base de datos para todos los productos
      const imageUrl = `/radar/pngs/${product.id}/image`;

      // Bounds por defecto para LGUAXX si faltan o están vacíos
      let finalBounds = null;
      if (product.metadata?.bounds?.northEast && product.metadata?.bounds?.southWest) {
        // Ya tiene el formato correcto (objeto con northEast/southWest)
        finalBounds = product.metadata.bounds;
      } else if (!finalBounds && radarId.toUpperCase() === 'LGUAXX') {
        // Bounds por defecto en formato objeto
        finalBounds = {
          southWest: [-4.9446, -80.7707],
          northEast: [-3.1361, -78.9676]
        };
      }

      indexByDate[productDate].push({
        filename: product.filename,
        url: `/api${imageUrl}`,
        timestamp: product.source_timestamp.toISOString(),
        bounds: finalBounds,
        metadata: product.metadata || null
      });
    });

    // Ordenar frames de cada fecha por timestamp
    Object.keys(indexByDate).forEach(dateKey => {
      indexByDate[dateKey].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    const dates = Array.from(allDates).sort();

    // Si se especificó una fecha, devolver solo esos frames
    if (date) {
      const framesForDate = indexByDate[date] || [];
      return res.json({
        success: true,
        radar: radarId,
        date,
        frames: framesForDate,
        source: 'postgresql'
      });
    }

    // Si no se especificó fecha, devolver índice completo
    const radarIndex = {};
    radarIndex[radarId.toUpperCase()] = indexByDate;

    return res.json({
      success: true,
      radar: radarId,
      dates,
      index: radarIndex,
      source: 'postgresql'
    });
  } catch (error) {
    console.error('Error al obtener viewer PNG index:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener índice de viewer',
      error: error.message
    });
  }
};