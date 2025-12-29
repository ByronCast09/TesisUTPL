const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const radarMetadataRepository = require('./radarMetadataRepository');
const crypto = require('crypto');

/**
 * Servicio para monitorear PNGs convertidos y subirlos automáticamente a PostgreSQL
 */
class PNGUploadService {
  constructor(config = {}) {
    this.pngPath = config.pngPath || process.env.PNG_OUTPUT_PATH;
    this.radarId = config.radarId || 'LGUAXX';
    this.watcher = null;
    this.processing = new Set();
    this.processedFiles = new Set(); // Track de archivos ya procesados
    this.debounceTime = config.debounceTime || 3000;
    this.debounceTimers = new Map();
    this.loadProcessedFiles();
  }

  /**
   * Carga la lista de archivos ya procesados desde un archivo de estado
   */
  loadProcessedFiles() {
    const stateFile = path.join(__dirname, '../storage', `png_upload_state_${this.radarId}.json`);
    try {
      if (fs.existsSync(stateFile)) {
        const data = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        this.processedFiles = new Set(data.processedFiles || []);
        console.log(`[png-upload] Cargados ${this.processedFiles.size} archivos ya procesados`);
      }
    } catch (error) {
      console.warn(`[png-upload] No se pudo cargar estado previo:`, error.message);
    }
  }

  /**
   * Guarda la lista de archivos procesados
   */
  saveProcessedFiles() {
    const stateFile = path.join(__dirname, '../storage', `png_upload_state_${this.radarId}.json`);
    try {
      const dir = path.dirname(stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(stateFile, JSON.stringify({
        processedFiles: Array.from(this.processedFiles),
        lastUpdate: new Date().toISOString(),
      }), 'utf-8');
    } catch (error) {
      console.warn(`[png-upload] No se pudo guardar estado:`, error.message);
    }
  }

  /**
   * Calcula el checksum de un archivo
   */
  calculateChecksum(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Extrae timestamp del nombre de archivo
   */
  extractTimestamp(filename) {
    try {
      // Formato esperado: LGUAXX_YYYYMMDD_HHMMSS.png
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
    } catch (error) {
      // Ignorar errores de parsing
    }
    return new Date();
  }

  /**
   * Sube un PNG a PostgreSQL
   */
  async uploadPNG(filePath) {
    const normalizedPath = path.normalize(filePath);
    const filename = path.basename(filePath);
    const fileKey = `${this.radarId}_${filename}`;

    // Verificar si ya fue procesado
    if (this.processedFiles.has(fileKey)) {
      console.log(`[png-upload] ${filename} ya fue procesado anteriormente, omitiendo...`);
      return;
    }

    // Evitar procesar el mismo archivo múltiples veces
    if (this.processing.has(normalizedPath)) {
      console.log(`[png-upload] ${filename} ya está siendo procesado, omitiendo...`);
      return;
    }

    // Cancelar timer de debounce si existe
    if (this.debounceTimers.has(normalizedPath)) {
      clearTimeout(this.debounceTimers.get(normalizedPath));
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(normalizedPath);
        this.processing.add(normalizedPath);

        try {
          console.log(`[png-upload] Procesando nuevo PNG: ${filename}`);

          // Leer el archivo
          const pngBuffer = fs.readFileSync(filePath);
          const fileSize = pngBuffer.length;
          const checksum = this.calculateChecksum(filePath);
          const sourceTimestamp = this.extractTimestamp(filename);

          // Buscar metadata JSON si existe
          let metadata = {};
          const jsonPath = filePath.replace(/\.png$/i, '.json');
          if (fs.existsSync(jsonPath)) {
            try {
              const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
              metadata = jsonData.metadata || jsonData || {};
            } catch (error) {
              console.warn(`[png-upload] No se pudo leer metadata JSON:`, error.message);
            }
          }

          // Construir metadata completo
          const fullMetadata = {
            ...metadata,
            source: 'ppi_converter',
            uploadDate: new Date().toISOString(),
            originalPath: filePath,
            checksum,
          };

          // Guardar en PostgreSQL
          const result = await radarMetadataRepository.recordProcessedFile({
            radarId: this.radarId.toUpperCase(),
            productType: metadata.productType || 'ppi_png',
            timestamp: metadata.sourceTimestamp ? new Date(metadata.sourceTimestamp) : sourceTimestamp,
            storagePath: filePath,
            pngBuffer,
            publicUrl: metadata.publicUrl || null,
            metadata: fullMetadata,
            rawSource: metadata.source || {},
            status: 'ready',
            fileSize,
            checksum,
            filename,
          });

          if (result) {
            console.log(`[png-upload] ✓ PNG subido a PostgreSQL: ${filename} (ID: ${result.id})`);
            this.processedFiles.add(fileKey);
            this.saveProcessedFiles();
          } else {
            console.warn(`[png-upload] ⚠ No se pudo registrar en PostgreSQL (DB no configurada?): ${filename}`);
          }

          resolve();
        } catch (error) {
          console.error(`[png-upload] ✗ Error subiendo ${filename}:`, error.message);
          resolve(); // Resolver para no bloquear otros archivos
        } finally {
          this.processing.delete(normalizedPath);
        }
      }, this.debounceTime);

      this.debounceTimers.set(normalizedPath, timer);
    });
  }

  /**
   * Procesa todos los PNGs existentes en el directorio
   */
  async processExistingPNGs() {
    if (!this.pngPath || !fs.existsSync(this.pngPath)) {
      console.warn(`[png-upload] Directorio de PNGs no existe: ${this.pngPath}`);
      return;
    }

    console.log(`[png-upload] Procesando PNGs existentes en ${this.pngPath}...`);

    const processDirectory = async (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
          await this.uploadPNG(fullPath);
          // Pequeña pausa para no sobrecargar
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    await processDirectory(this.pngPath);
    console.log(`[png-upload] Procesamiento de PNGs existentes completado`);
  }

  /**
   * Inicia el monitoreo del directorio
   */
  async start(processExisting = true) {
    if (!this.pngPath || !fs.existsSync(this.pngPath)) {
      console.error(`[png-upload] Directorio de PNGs no existe: ${this.pngPath}`);
      return false;
    }

    console.log(`[png-upload] Iniciando monitoreo de PNGs para ${this.radarId}`);
    console.log(`[png-upload] Directorio: ${this.pngPath}`);

    // Procesar PNGs existentes si se solicita
    if (processExisting) {
      await this.processExistingPNGs();
    }

    // Monitorear nuevos archivos PNG
    this.watcher = chokidar.watch('**/*.png', {
      cwd: this.pngPath,
      ignored: /(^|[\/\\])\../, // Ignorar archivos ocultos
      persistent: true,
      ignoreInitial: true, // Ya procesamos los existentes
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 1000,
      },
    });

    this.watcher
      .on('add', (filePath) => {
        const fullPath = path.join(this.pngPath, filePath);
        this.uploadPNG(fullPath).catch(err => {
          console.error(`[png-upload] Error en uploadPNG:`, err);
        });
      })
      .on('change', (filePath) => {
        // También procesar si el archivo cambia
        const fullPath = path.join(this.pngPath, filePath);
        this.uploadPNG(fullPath).catch(err => {
          console.error(`[png-upload] Error en uploadPNG:`, err);
        });
      })
      .on('error', (error) => {
        console.error(`[png-upload] Error del watcher:`, error);
      })
      .on('ready', () => {
        console.log(`[png-upload] Monitoreo activo. Esperando nuevos PNGs...`);
      });

    return true;
  }

  /**
   * Detiene el monitoreo
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log(`[png-upload] Monitoreo detenido`);
    }

    // Limpiar timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.processing.clear();
    this.saveProcessedFiles();
  }
}

module.exports = PNGUploadService;

