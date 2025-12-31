const fs = require('fs');
const path = require('path');
const axios = require('axios');
const radarMetadataRepository = require('./radarMetadataRepository');
const remoteRadarService = require('./remoteRadarService');
const crypto = require('crypto');

/**
 * Servicio para sincronizar PNGs desde la PC remota y subirlos a PostgreSQL local
 * Monitorea la API remota periódicamente y descarga PNGs nuevos automáticamente
 */
class PNGSyncService {
  constructor(config = {}) {
    this.radarId = config.radarId || 'LGUAXX';
    this.syncInterval = config.syncInterval || 5 * 60 * 1000; // 5 minutos por defecto
    this.lastSyncTime = null;
    this.syncedFiles = new Set(); // Track de archivos ya sincronizados
    this.isRunning = false;
    this.syncTimer = null;
    this.loadSyncState();
  }

  /**
   * Carga el estado de sincronización desde archivo
   */
  loadSyncState() {
    const stateFile = path.join(__dirname, '../storage', `png_sync_state_${this.radarId}.json`);
    try {
      if (fs.existsSync(stateFile)) {
        const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        this.syncedFiles = new Set(data.syncedFiles || []);
        this.lastSyncTime = data.lastSyncTime ? new Date(data.lastSyncTime) : null;
        console.log(`[png-sync] Cargados ${this.syncedFiles.size} archivos ya sincronizados`);
      }
    } catch (error) {
      console.warn(`[png-sync] No se pudo cargar estado previo:`, error.message);
    }
  }

  /**
   * Guarda el estado de sincronización
   */
  saveSyncState() {
    const stateFile = path.join(__dirname, '../storage', `png_sync_state_${this.radarId}.json`);
    try {
      const dir = path.dirname(stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(stateFile, JSON.stringify({
        syncedFiles: Array.from(this.syncedFiles),
        lastSyncTime: this.lastSyncTime ? this.lastSyncTime.toISOString() : null,
        lastUpdate: new Date().toISOString(),
      }), 'utf-8');
    } catch (error) {
      console.warn(`[png-sync] No se pudo guardar estado:`, error.message);
    }
  }

  /**
   * Calcula checksum de un buffer
   */
  calculateChecksum(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Extrae timestamp del nombre de archivo
   */
  extractTimestamp(filename, date) {
    try {
      const match = filename.match(/(\d{8})_(\d{6})/);
      if (match) {
        const dateStr = match[1];
        const timeStr = match[2];
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);
        const second = timeStr.substring(4, 6);
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
      }
      if (date) {
        return new Date(`${date}T12:00:00Z`);
      }
      return new Date();
    } catch (error) {
      return new Date();
    }
  }

  /**
   * Descarga un PNG desde la URL remota con reintentos
   */
  async downloadPNG(url, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[png-sync DEBUG] Descargando URL: ${url}`);
        const response = await axios({
          method: 'GET',
          url,
          responseType: 'arraybuffer',
          timeout: Number(process.env.RADAR_REMOTE_FILE_TIMEOUT_MS || 120000),
        });
        const buffer = Buffer.from(response.data);
        console.log(`[png-sync DEBUG] Descargado: ${buffer.length} bytes desde ${url}`);
        return buffer;
      } catch (error) {
        lastError = error;
        const isNetworkError = error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.message.includes('timeout');

        if (isNetworkError && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Backoff exponencial, máximo 5s
          console.log(`[png-sync] Reintento ${attempt}/${maxRetries} después de ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Error descargando PNG: ${error.message} (código: ${error.code || 'unknown'})`);
      }
    }
    throw lastError;
  }

  /**
   * Descarga JSON metadata asociado al PNG (opcional, no falla si no existe)
   */
  async downloadJSON(pngUrl) {
    try {
      // Convertir URL del PNG a URL del JSON
      // Ejemplo: .../LOXX_20251231_034500.png -> .../LOXX_20251231_034500.json
      const jsonUrl = pngUrl.replace(/\.png$/i, '.json');

      console.log(`[png-sync] Intentando descargar JSON metadata: ${jsonUrl}`);

      const response = await axios({
        method: 'GET',
        url: jsonUrl,
        responseType: 'json',
        timeout: 30000, // 30s timeout
      });

      if (response.data) {
        console.log(` [png-sync] ✓ JSON metadata descargado exitosamente`);
        console.log(`[png-sync] 📊 JSON content keys:`, Object.keys(response.data));
        console.log(`[png-sync] 📊 maxDbz value:`, response.data.maxDbz);
        console.log(`[png-sync] 📊 Full JSON (first 500 chars):`, JSON.stringify(response.data).substring(0, 500));
        return response.data;
      }

      return null;
    } catch (error) {
      // No es crítico si el JSON no existe
      if (error.response?.status === 404) {
        console.log(`[png-sync] JSON metadata no encontrado (404) - continuando sin stats`);
      } else {
        console.warn(`[png-sync] Advertencia: No se pudo descargar JSON metadata: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Sincroniza un PNG desde la PC remota + su JSON metadata
   */
  async syncPNG(pngFile, date) {
    const fileKey = `${this.radarId}_${date}_${pngFile.name}`;

    // Verificar si ya fue sincronizado
    if (this.syncedFiles.has(fileKey)) {
      return { skipped: true, reason: 'ya_sincronizado' };
    }

    try {
      console.log(`[png-sync] Descargando PNG: ${pngFile.name} (${date})`);

      // Descargar el PNG
      const pngBuffer = await this.downloadPNG(pngFile.url);
      const checksum = this.calculateChecksum(pngBuffer);
      const sourceTimestamp = this.extractTimestamp(pngFile.name, date);

      // 🆕 Descargar JSON metadata asociado (si existe)
      const jsonMetadata = await this.downloadJSON(pngFile.url);

      // Verificar si ya existe en PostgreSQL por checksum
      const existing = await radarMetadataRepository.listProcessed({
        radarId: this.radarId.toUpperCase(),
        productType: 'ppi_png',
        from: new Date(sourceTimestamp.getTime() - 60000), // 1 minuto antes
        to: new Date(sourceTimestamp.getTime() + 60000), // 1 minuto después
      });

      const existingEntry = existing.find(entry => {
        const entryChecksum = entry.metadata?.checksum || entry.checksum;
        return entryChecksum === checksum || entry.filename === pngFile.name;
      });

      // Si existe, siempre reemplazarlo (para permitir reprocesamiento)
      if (existingEntry) {
        if (existingEntry.png_data) {
          // Ya tiene datos de imagen, pero lo reemplazamos para permitir reprocesamiento
          console.log(`[png-sync] PNG ya existe con datos de imagen: ${pngFile.name}, reemplazando...`);
        } else {
          // Existe pero sin datos de imagen, actualizar
          console.log(`[png-sync] PNG existe pero sin datos de imagen, actualizando: ${pngFile.name}`);
        }
      }

      // Construir metadata completo (merge con JSON metadata)
      const metadata = {
        source: 'remote_sync',
        downloadDate: new Date().toISOString(),
        originalUrl: pngFile.url,
        date,
        filename: pngFile.name,
        checksum,
        // 🆕 Agregar stats del JSON si están disponibles
        ...(jsonMetadata && {
          // Normalizar campos: GUAXX usa 'max'/'min', LOXX usa 'maxDbz'/'minDbz'
          maxDbz: jsonMetadata.maxDbz || jsonMetadata.max,
          minDbz: jsonMetadata.minDbz || jsonMetadata.min,
          max: jsonMetadata.max || jsonMetadata.maxDbz,
          min: jsonMetadata.min || jsonMetadata.minDbz,
          stats: jsonMetadata.stats,
          precipitation: jsonMetadata.precipitation,
          bounds: jsonMetadata.bounds,
          shape: jsonMetadata.shape,
          rows: jsonMetadata.rows,
          cols: jsonMetadata.cols,
          productType: jsonMetadata.productType,
          radarName: jsonMetadata.radarName,
        }),
      };

      // Guardar en PostgreSQL
      const result = await radarMetadataRepository.recordProcessedFile({
        radarId: this.radarId.toUpperCase(),
        productType: 'ppi_png',
        timestamp: sourceTimestamp,
        storagePath: pngFile.url, // Guardamos la URL como storage_path
        pngBuffer,
        publicUrl: null,
        metadata,
        rawSource: { url: pngFile.url, date, filename: pngFile.name },
        status: 'ready',
        fileSize: pngBuffer.length,
        checksum,
        filename: pngFile.name,
      });

      if (result) {
        const statsInfo = jsonMetadata?.maxDbz ? `(maxDbz: ${jsonMetadata.maxDbz} dBZ)` : '(sin stats)';
        console.log(`[png-sync] ✓ PNG sincronizado: ${pngFile.name} ${statsInfo} (ID: ${result.id})`);
        this.syncedFiles.add(fileKey);
        this.saveSyncState();
        return { success: true, id: result.id };
      } else {
        return { success: false, reason: 'db_not_configured' };
      }
    } catch (error) {
      console.error(`[png-sync] ✗ Error sincronizando ${pngFile.name}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta una sincronización completa con manejo robusto de errores
   */
  async performSync() {
    if (this.isRunning) {
      console.log(`[png-sync] Sincronización ya en progreso, omitiendo...`);
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`[png-sync] Iniciando sincronización para ${this.radarId}...`);

      // Obtener lista de archivos remotos con reintentos
      let allFiles;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          allFiles = await remoteRadarService.listAllRemoteFiles(this.radarId);
          break; // Éxito, salir del bucle
        } catch (error) {
          retryCount++;
          const isNetworkError = error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ENOTFOUND' ||
            error.message.includes('timeout') ||
            error.message.includes('No se pudo obtener');

          if (isNetworkError && retryCount < maxRetries) {
            const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000); // Backoff exponencial
            console.warn(`[png-sync] Error de conexión (intento ${retryCount}/${maxRetries}): ${error.message}`);
            console.log(`[png-sync] Reintentando en ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // Error no recuperable o se agotaron los reintentos
            console.error(`[png-sync] ✗ No se pudo obtener índice remoto después de ${retryCount} intentos:`, error.message);
            // No lanzar el error - permitir que el servicio continúe y reintente en el próximo ciclo
            console.log(`[png-sync] La próxima sincronización se intentará en ${this.syncInterval / 1000}s`);
            return; // Salir sin error para que el servicio continúe funcionando
          }
        }
      }

      if (!allFiles || allFiles.length === 0) {
        console.log(`[png-sync] No se encontraron archivos remotos para ${this.radarId}`);
        return;
      }

      const results = {
        total: 0,
        downloaded: 0,
        skipped: 0,
        errors: [],
      };

      // Procesar cada fecha (empezar por las más recientes)
      const sortedFiles = allFiles.sort((a, b) => b.date.localeCompare(a.date));

      // ⚡ OPTIMIZACIÓN: Solo procesar las últimas 2 fechas (hoy y ayer)
      // Los archivos históricos ya fueron sincronizados y se saltarán de todas formas
      const recentFiles = sortedFiles.slice(0, 2);
      console.log(`[png-sync] Procesando ${recentFiles.length} fechas más recientes (de ${sortedFiles.length} total)`);
      if (recentFiles.length > 0) {
        console.log(`[png-sync] Fechas a procesar: ${recentFiles.map(f => f.date).join(', ')}`);
      }

      // ⏰ TIMEOUT DE SEGURIDAD (solo para evitar bloqueos infinitos)
      const MAX_SYNC_TIME_MS = 2 * 60 * 60 * 1000;  // Máximo 2 horas
      const syncDeadline = startTime + MAX_SYNC_TIME_MS;

      for (const dateEntry of recentFiles) {
        if (!dateEntry.png || dateEntry.png.length === 0) {
          continue;
        }

        // 🔥 IMPORTANTE: Ordenar PNGs por nombre DESCENDENTE (más recientes primero)
        // Formato: LOXX_20251223_180500.png -> procesar 180500 antes que 180000
        const sortedPngs = [...dateEntry.png].sort((a, b) => b.name.localeCompare(a.name));

        // Procesar PNGs de esta fecha (empezando por los más recientes)
        for (const pngFile of sortedPngs) {
          // ⏰ VERIFICAR TIMEOUT (única protección)
          if (Date.now() > syncDeadline) {
            console.warn(`[png-sync] ⚠️ Tiempo límite alcanzado (2 horas), deteniendo sincronización`);
            console.log(`[png-sync] Procesados ${results.downloaded} nuevos archivos antes del timeout`);
            break;
          }

          results.total++;

          const result = await this.syncPNG(pngFile, dateEntry.date);

          if (result.success) {
            results.downloaded++;
          } else if (result.skipped) {
            results.skipped++;
          } else {
            results.errors.push({ file: pngFile.name, error: result.error || result.reason });
          }

          // Pequeña pausa para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 500));
        }


        // Si alcanzamos timeout, salir del bucle de fechas también
        if (Date.now() > syncDeadline) {
          break;
        }
      }

      this.lastSyncTime = new Date();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`[png-sync] ✓ Sincronización completada en ${elapsed}s`);
      console.log(`[png-sync] Total: ${results.total}, Descargados: ${results.downloaded}, Omitidos: ${results.skipped}, Errores: ${results.errors.length}`);

      if (results.errors.length > 0) {
        console.warn(`[png-sync] ⚠️ Errores encontrados (${results.errors.length}):`);
        results.errors.slice(0, 10).forEach((err, idx) => {
          console.warn(`  ${idx + 1}. ${err.file}: ${err.error}`);
        });
        if (results.errors.length > 10) {
          console.warn(`  ... y ${results.errors.length - 10} errores más`);
        }
      }

      this.saveSyncState();
    } catch (error) {
      const errorType = error.code || 'unknown';
      const isNetworkError = error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.message.includes('timeout') ||
        error.message.includes('No se pudo obtener');

      if (isNetworkError) {
        console.warn(`[png-sync] ⚠️ Error de conexión (${errorType}): ${error.message}`);
        console.log(`[png-sync] La próxima sincronización se intentará en ${this.syncInterval / 1000}s`);
      } else {
        console.error(`[png-sync] ✗ Error en sincronización:`, error.message);
      }
      // No lanzar el error - permitir que el servicio continúe funcionando
    } finally {
      this.isRunning = false;
      console.log(`[png-sync] Estado de sincronización liberado para ${this.radarId}`);
    }
  }

  /**
   * Inicia el servicio de sincronización automática
   */
  start() {
    if (this.syncTimer) {
      console.log(`[png-sync] Servicio ya está corriendo`);
      return;
    }

    console.log(`[png-sync] Iniciando servicio de sincronización para ${this.radarId}`);
    console.log(`[png-sync] Intervalo: ${this.syncInterval / 1000} segundos`);

    // Ejecutar sincronización inmediata
    this.performSync().catch(err => {
      console.error(`[png-sync] Error en sincronización inicial:`, err);
    });

    // Programar sincronizaciones periódicas
    this.syncTimer = setInterval(() => {
      this.performSync().catch(err => {
        console.error(`[png-sync] Error en sincronización periódica:`, err);
      });
    }, this.syncInterval);

    console.log(`[png-sync] Servicio iniciado. Sincronizando cada ${this.syncInterval / 1000} segundos`);
  }

  /**
   * Detiene el servicio
   */
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log(`[png-sync] Servicio detenido`);
    }
    this.saveSyncState();
  }

  /**
   * Fuerza una sincronización inmediata
   */
  async forceSync() {
    await this.performSync();
  }
}

module.exports = PNGSyncService;

