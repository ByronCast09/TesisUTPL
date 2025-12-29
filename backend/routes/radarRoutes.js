const express = require('express');
const router = express.Router();
const radarController = require('../controllers/radarController');

// Obtener datos actuales de los radares
router.get('/current', radarController.getCurrentRadarData);

// Pipeline status y trigger manual
router.get('/pipeline/status', radarController.getPipelineStatus);
router.post('/pipeline/run', radarController.triggerPipelineRun);

// Obtener datos históricos por fecha
router.get('/historical/:date', radarController.getHistoricalData);

// Obtener URL de WMS para un radar específico
router.get('/:radarId/wms', radarController.getWmsUrl);

// Obtener último WMS desde archivos locales
router.get('/:radarId/latest-local-wms', radarController.getLatestLocalWms);

// Listar todos los archivos remotos por fecha (nc/png)
router.get('/:radarId/remote-index', radarController.getRemoteIndex);

// Índice específico de GIFs remotos
router.get('/:radarId/remote-gif-index', radarController.getRemoteGifIndex);

// Proxy seguro para servir imágenes PNG remotas
router.get('/:radarId/proxy-image', radarController.proxyRemoteImage);

// Publicar/obtener WMS por fecha/archivo o último remoto
router.get('/:radarId/remote-wms', radarController.getRemoteWmsByQuery);

// Obtener datos específicos de un radar
router.get('/:radarId', radarController.getRadarData);
router.get('/:radarId/latest-gif', radarController.getLatestGif);
router.get('/:radarId/gif-by-date', radarController.getGifByDate);

// Remote index endpoints
router.get('/:radarId/remote-index', radarController.getRemoteIndex);
router.get('/:radarId/remote-gif-index', radarController.getRemoteGifIndex);
router.get('/:radarId/proxy-image', radarController.proxyRemoteImage);

// NEW: convert latest netCDF to PNG and stream it
router.get('/:radarId/convert-latest', radarController.convertAndServeLatest);

// Nuevas rutas para imágenes procesadas
router.get('/:radarId/latest-image', radarController.getLatestImage);
router.get('/:radarId/timeline', radarController.getTimeline);
router.get('/:radarId/available-dates', radarController.getAvailableDates);
router.get('/:radarId/historical-index', radarController.getHistoricalIndex);
router.post('/:radarId/process-date', radarController.processDate);
router.get('/:radarId/daily-gif', radarController.getDailyGif);

// Nuevas rutas para PNGs en PostgreSQL
router.post('/:radarId/download-pngs', radarController.downloadAllNewPngs);
router.post('/:radarId/download-pngs/date', radarController.downloadPngsForDate);
router.post('/:radarId/download-pngs/recent', radarController.downloadRecentPngs);
router.get('/:radarId/pngs', radarController.getPngsFromDb);
router.get('/:radarId/pngs/index', radarController.getPngIndexFromDb);
// Ruta para el visor (formato compatible con remote-index)
router.get('/:radarId/pngs/viewer-index', radarController.getPngIndexForViewer);
// Ruta simplificada para visor (devuelve todos los frames, frontend filtra por fecha)
router.get('/:radarId/pngs/viewer-frames', require('../controllers/viewerController').getPngIndexForViewerSimple);
router.get('/:radarId/pngs/latest-today', radarController.getLatestImageToday);
router.get('/pngs/:id/image', radarController.getPngImageFromDb);
// Servir PNG por filename (para compat con URLs del viewer-index)
router.get('/radar-images/:radarId/:date/:filename', radarController.getPngImageByFilename);

module.exports = router;