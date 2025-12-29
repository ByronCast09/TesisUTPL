require('dotenv').config();
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const radarRoutes = require('./routes/radarRoutes');
const ingestRoutes = require('./routes/ingestRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const healthRoutes = require('./routes/healthRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const scheduledTasks = require('./services/scheduledTasks');
const pipelineConfig = require('./config/pipelineConfig');
const metadataRepository = require('./services/radarMetadataRepository');
const imageCacheService = require('./services/imageCacheService');
const PPIWatcherService = require('./services/ppiWatcherService');
const PNGUploadService = require('./services/pngUploadService');
const PNGSyncService = require('./services/pngSyncService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware básico
app.use(cors());

// Compresión HTTP (reduce ancho de banda 70-90%)
if (process.env.ENABLE_COMPRESSION !== 'false') {
  app.use(compression({
    level: Number(process.env.COMPRESSION_LEVEL || 6),
    threshold: 1024, // Solo comprimir respuestas > 1KB
    filter: (req, res) => {
      // No comprimir si el cliente lo solicita
      if (req.headers['x-no-compression']) {
        return false;
      }
      // No comprimir imágenes (ya están comprimidas)
      const contentType = res.getHeader('Content-Type');
      if (contentType && contentType.startsWith('image/')) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  console.log('[Optimización] Compresión HTTP habilitada (nivel ' + (process.env.COMPRESSION_LEVEL || 6) + ')');
}

app.use(express.json());

// Rate Limiting para prevenir abuso
if (process.env.ENABLE_RATE_LIMIT !== 'false') {
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 500),
    message: 'Demasiadas peticiones desde esta IP, intenta más tarde',
    standardHeaders: true,
    legacyHeaders: false,
    // Excluir TODAS las rutas del visor del rate limiting
    skip: (req) => {
      const path = req.path;
      // Excluir rutas de imágenes individuales
      if (path.includes('/pngs/') && path.includes('/image')) return true;
      // Excluir listados de PNGs por fecha
      if (path.includes('/pngs') && req.query.date) return true;
      // Excluir obtención de fechas disponibles
      if (path.includes('/available-dates')) return true;
      // Excluir health checks
      if (path.includes('/health') || path.includes('/stats')) return true;
      return false;
    }
  });

  // Aplicar a todas las rutas API
  app.use('/api/', limiter);

  // Rate limit más estricto solo para operaciones de descarga masiva
  const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiadas descargas, intenta más tarde'
  });

  app.use('/api/radar/:radarId/download-pngs', strictLimiter);
  app.use('/api/radar/:radarId/download-pngs/date', strictLimiter);
  app.use('/api/radar/:radarId/download-pngs/recent', strictLimiter);

  console.log('[Optimización] Rate limiting habilitado con exclusiones para visor (max ' + (process.env.RATE_LIMIT_MAX || 500) + ' req/' + (process.env.RATE_LIMIT_WINDOW || 15) + 'min)');
}

// Asegurar directorio de imágenes procesadas
fs.mkdirSync(pipelineConfig.paths.processedStorageDir, { recursive: true });

// Routes
app.use('/api/radar', radarRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api', healthRoutes); // Health check y stats
app.use('/api/analytics', analyticsRoutes);

// Servir imágenes procesadas
app.use('/radar-images', express.static(pipelineConfig.paths.processedStorageDir));
app.use('/api/radar-images', express.static(pipelineConfig.paths.processedStorageDir));

// Iniciar tareas programadas para obtener datos cada 5 minutos
scheduledTasks.initScheduledJobs();

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Servicios de monitoreo automático
const ppiWatchers = [];
const pngUploaders = [];
const pngSyncServices = [];
const h5Watchers = [];

function initAutoServices() {
  // Verificar si el monitoreo automático está habilitado
  const enablePPIWatcher = process.env.ENABLE_PPI_WATCHER === 'true' || process.env.ENABLE_PPI_WATCHER === '1';
  const enablePNGUploader = process.env.ENABLE_PNG_UPLOADER === 'true' || process.env.ENABLE_PNG_UPLOADER === '1';

  if (enablePPIWatcher) {
    console.log('[auto-services] Iniciando monitoreo automático de PPI...');

    // Configurar watchers para cada radar
    const radars = ['LGUAXX', 'LOXX'];
    radars.forEach(radarId => {
      const dataPath = process.env[`PPI_DATA_PATH_${radarId}`] || process.env.PPI_DATA_PATH;
      const outputPath = process.env[`PNG_OUTPUT_PATH_${radarId}`] || process.env.PNG_OUTPUT_PATH;

      if (dataPath && outputPath) {
        const watcher = new PPIWatcherService({
          dataPath,
          outputPath,
          radarId,
        });

        if (watcher.start()) {
          ppiWatchers.push(watcher);
          console.log(`[auto-services] ✓ Monitoreo PPI iniciado para ${radarId}`);
        } else {
          console.warn(`[auto-services] ⚠ No se pudo iniciar monitoreo PPI para ${radarId}`);
        }
      } else {
        console.warn(`[auto-services] ⚠ Configuración faltante para monitoreo PPI de ${radarId}`);
      }
    });
  } else {
    console.log('[auto-services] Monitoreo automático de PPI deshabilitado (ENABLE_PPI_WATCHER no está en true)');
  }

  if (enablePNGUploader) {
    console.log('[auto-services] Iniciando monitoreo automático de PNGs...');

    // Configurar uploaders para cada radar
    const radars = ['LGUAXX', 'LOXX'];
    radars.forEach(radarId => {
      const pngPath = process.env[`PNG_OUTPUT_PATH_${radarId}`] || process.env.PNG_OUTPUT_PATH;

      if (pngPath) {
        const uploader = new PNGUploadService({
          pngPath,
          radarId,
        });

        uploader.start(true).then(success => {
          if (success) {
            pngUploaders.push(uploader);
            console.log(`[auto-services] ✓ Monitoreo PNG iniciado para ${radarId}`);
          } else {
            console.warn(`[auto-services] ⚠ No se pudo iniciar monitoreo PNG para ${radarId}`);
          }
        }).catch(error => {
          console.error(`[auto-services] ✗ Error iniciando monitoreo PNG para ${radarId}:`, error.message);
        });
      } else {
        console.warn(`[auto-services] ⚠ Configuración faltante para monitoreo PNG de ${radarId}`);
      }
    });
  } else {
    console.log('[auto-services] Monitoreo automático de PNGs deshabilitado (ENABLE_PNG_UPLOADER no está en true)');
  }

  // Servicio de sincronización desde PC remota (para PC local)
  const enablePNGSync = process.env.ENABLE_PNG_SYNC === 'true' || process.env.ENABLE_PNG_SYNC === '1';

  if (enablePNGSync) {
    console.log('[auto-services] Iniciando sincronización automática de PNGs desde PC remota...');

    const syncInterval = parseInt(process.env.PNG_SYNC_INTERVAL || '300000', 10); // 5 minutos por defecto

    // Solo sincronizar radares que tienen URL configurada
    const radarsToSync = [];
    const allRadars = ['LGUAXX', 'LOXX'];

    allRadars.forEach(radarId => {
      const urlEnvVar = `RADAR_${radarId}_URL`;
      const url = process.env[urlEnvVar];

      if (url && url.trim()) {
        radarsToSync.push(radarId);
        console.log(`[auto-services] ${radarId} configurado: ${url}`);
      } else {
        console.log(`[auto-services] ⚠ ${radarId} no configurado (${urlEnvVar} no está en .env), omitiendo sincronización`);
      }
    });

    if (radarsToSync.length === 0) {
      console.log('[auto-services] ⚠ No hay radares configurados para sincronización');
      return;
    }

    radarsToSync.forEach(radarId => {
      const syncService = new PNGSyncService({
        radarId,
        syncInterval,
      });

      syncService.start();
      pngSyncServices.push(syncService);
      console.log(`[auto-services] ✓ Sincronización PNG iniciada para ${radarId} (cada ${syncInterval / 1000}s)`);
    });
  } else {
    console.log('[auto-services] Sincronización automática de PNGs deshabilitada (ENABLE_PNG_SYNC no está en true)');
  }

  // NOTA: El monitoreo de archivos H5 se hace en la PC REMOTA
  // usando el script Python h5_auto_processor_service.py
  // Los PNGs generados se sincronizan automáticamente mediante ENABLE_PNG_SYNC
  console.log('[auto-services] Monitoreo H5: Se ejecuta en PC REMOTA con h5_auto_processor_service.py');
}

/**
 * Ejecuta resincronización forzada de LOXX si está habilitado en .env
 * Esto reemplaza archivos viejos corruptos con los nuevos procesados correctamente
 */
async function forceResyncLOXXIfEnabled() {
  const shouldForceResync = process.env.FORCE_RESYNC_LOXX_ON_START === 'true';

  if (!shouldForceResync) {
    console.log('[force-resync] Resincronización forzada de LOXX deshabilitada');
    return;
  }

  console.log('[force-resync] ⚠️  Iniciando resincronización forzada de LOXX...');
  console.log('[force-resync] Esto reemplazará TODOS los archivos LOXX en la base de datos');
  console.log('[force-resync] Puede tardar 2-3 horas dependiendo del volumen de datos');

  try {
    // Importar el módulo de resincronización
    const { forzarResincronizacion } = require('./services/forzar_resincronizacion_loxx');

    // Ejecutar en background (no bloquear el inicio del servidor)
    forzarResincronizacion().then(() => {
      console.log('[force-resync] ✓ Resincronización forzada de LOXX completada');
      console.log('[force-resync] IMPORTANTE: Cambia FORCE_RESYNC_LOXX_ON_START=false en .env para evitar repetir este proceso');
    }).catch(error => {
      console.error('[force-resync] ✗ Error en resincronización forzada:', error.message);
    });

    console.log('[force-resync] Proceso iniciado en background. El servidor continuará funcionando normalmente.');
  } catch (error) {
    console.error('[force-resync] ✗ Error iniciando resincronización forzada:', error.message);
  }
}

metadataRepository.ensureSchema()
  .then((initialized) => {
    if (initialized) {
      console.log('Esquema de Postgres listo.');
      // Inicializar caché de imágenes
      imageCacheService.initialize().then(() => {
        console.log('[Optimización] Caché de imágenes inicializado');
      });
      // Iniciar servicios automáticos después de que la BD esté lista
      initAutoServices();
      // Ejecutar resincronización forzada de LOXX si está habilitada
      forceResyncLOXXIfEnabled();
    }
  })
  .catch((error) => {
    console.error('No se pudo inicializar el esquema de Postgres:', error.message);
    // Intentar iniciar servicios de todos modos (pueden funcionar sin BD para PPI)
    initAutoServices();
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  });

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\n[auto-services] Deteniendo servicios automáticos...');
  ppiWatchers.forEach(watcher => watcher.stop());
  pngUploaders.forEach(uploader => uploader.stop());
  pngSyncServices.forEach(sync => sync.stop());
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[auto-services] Deteniendo servicios automáticos...');
  ppiWatchers.forEach(watcher => watcher.stop());
  pngUploaders.forEach(uploader => uploader.stop());
  pngSyncServices.forEach(sync => sync.stop());
  process.exit(0);
});