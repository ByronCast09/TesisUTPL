const schedule = require('node-schedule');
const pipelineConfig = require('../config/pipelineConfig');
const radarPipelineService = require('./radarPipelineService');
const pngDownloadService = require('./pngDownloadService');

/**
 * Tarea para descargar PNGs automáticamente
 */
async function downloadPngsTask() {
  const start = Date.now();
  console.log(`[png-download] Iniciando descarga automática de PNGs: ${new Date().toISOString()}`);

  const radars = ['LGUAXX', 'LOXX'];
  const results = [];

  for (const radarId of radars) {
    try {
      console.log(`[png-download] Descargando PNGs recientes para ${radarId}...`);
      // Descargar PNGs de los últimos 3 días
      const result = await pngDownloadService.downloadRecentPngs(radarId, 3);
      results.push({
        radarId,
        success: true,
        downloaded: result.downloaded,
        skipped: result.skipped,
        errors: result.errors.length,
      });
      console.log(`[png-download] ${radarId}: ${result.downloaded} descargados, ${result.skipped} omitidos`);
    } catch (error) {
      console.error(`[png-download] Error al descargar PNGs para ${radarId}:`, error.message);
      results.push({
        radarId,
        success: false,
        error: error.message,
      });
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[png-download] Tarea completada en ${elapsed}s`);
  return results;
}

/**
 * Inicializa las tareas programadas para obtener datos de los radares
 */
exports.initScheduledJobs = () => {
  // Verificar si el pipeline está habilitado (para procesamiento directo de .nc vía SFTP)
  const enablePipeline = process.env.ENABLE_RADAR_PIPELINE === 'true' || process.env.ENABLE_RADAR_PIPELINE === '1';

  if (enablePipeline) {
    // Programar tarea para ejecutarse cada 5 minutos
    schedule.scheduleJob(pipelineConfig.cron, async () => {
      const start = Date.now();
      console.log(`[pipeline] Ejecutando tarea programada: ${new Date().toISOString()}`);

      try {
        const results = await radarPipelineService.runCycle();
        results.forEach((result) => {
          console.log(`[pipeline] Radar ${result.radarId} => ${result.status}`);
        });
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`[pipeline] Tarea completada en ${elapsed}s`);
      } catch (error) {
        console.error('[pipeline] Error en la tarea programada:', error);
      }
    });
    console.log(`[pipeline] Tarea programada iniciada: ${pipelineConfig.cron}`);
  } else {
    console.log('[pipeline] Pipeline de procesamiento deshabilitado (ENABLE_RADAR_PIPELINE no está en true)');
    console.log('[pipeline] Si usas PNG Sync Service, esto es correcto - los PNG ya vienen procesados de las PC remotas');
  }

  // Verificar si la descarga automática de PNGs está habilitada
  const enablePngDownload = process.env.ENABLE_PNG_DOWNLOAD_SCHEDULED === 'true' || process.env.ENABLE_PNG_DOWNLOAD_SCHEDULED === '1';

  if (enablePngDownload) {
    // Programar descarga automática de PNGs cada hora
    // Configurable mediante variable de entorno PNG_DOWNLOAD_CRON (por defecto: cada hora)
    const pngCron = process.env.PNG_DOWNLOAD_CRON || '0 * * * *'; // Cada hora en el minuto 0
    schedule.scheduleJob(pngCron, downloadPngsTask);
    console.log(`[png-download] Tarea programada para descargar PNGs: ${pngCron}`);
  } else {
    console.log('[png-download] Descarga programada de PNGs deshabilitada (ENABLE_PNG_DOWNLOAD_SCHEDULED no está en true)');
    console.log('[png-download] PNG Sync Service ya se encarga de la sincronización automática');
  }

  console.log('Tareas programadas inicializadas');
};