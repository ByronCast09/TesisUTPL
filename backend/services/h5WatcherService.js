const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

/**
 * Servicio para monitorear archivos H5 comprimidos de LOXX y procesarlos automáticamente a PNG
 */
class H5WatcherService {
  constructor(config = {}) {
    this.dataPath = config.dataPath || process.env.H5_DATA_PATH_LOXX || 'F:\\LOXX\\H5';
    this.outputPath = config.outputPath || process.env.PNG_OUTPUT_PATH_LOXX || 'F:\\LOXX\\PNG_OUTPUT';
    this.radarId = config.radarId || 'LOXX';
    this.pythonCmd = config.pythonCmd || process.env.PYTHON_CMD || 'python';
    this.converterScript = config.converterScript || path.join(__dirname, '../../scripts/process_loxx_h5_compressed.py');
    this.watcher = null;
    this.processing = new Set(); // Evitar procesar el mismo archivo múltiples veces
    this.debounceTime = config.debounceTime || 5000; // Esperar 5 segundos antes de procesar
    this.debounceTimers = new Map();
  }

  /**
   * Procesa un nuevo archivo H5 comprimido
   */
  async processNewH5(filePath) {
    const normalizedPath = path.normalize(filePath);
    
    // Evitar procesar el mismo archivo múltiples veces
    if (this.processing.has(normalizedPath)) {
      console.log(`[h5-watcher] ${path.basename(filePath)} ya está siendo procesado`);
      return;
    }

    // Cancelar timer anterior si existe
    if (this.debounceTimers.has(normalizedPath)) {
      clearTimeout(this.debounceTimers.get(normalizedPath));
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(normalizedPath);
        this.processing.add(normalizedPath);

        try {
          const filename = path.basename(filePath);
          console.log(`[h5-watcher] Procesando nuevo archivo H5: ${filename}`);

          // Verificar que el archivo existe y no está siendo escrito
          if (!fs.existsSync(filePath)) {
            console.log(`[h5-watcher] Archivo no encontrado: ${filename}`);
            this.processing.delete(normalizedPath);
            resolve(false);
            return;
          }

          // Verificar que el archivo no esté siendo escrito (esperar estabilidad)
          const stats = fs.statSync(filePath);
          const now = Date.now();
          const fileAge = now - stats.mtimeMs;
          
          if (fileAge < 2000) {
            console.log(`[h5-watcher] Archivo muy reciente, esperando estabilidad: ${filename}`);
            this.processing.delete(normalizedPath);
            // Reprogramar para más tarde
            const newTimer = setTimeout(() => {
              this.processNewH5(filePath).catch(err => {
                console.error(`[h5-watcher] Error al reprocesar:`, err);
              });
            }, 3000);
            this.debounceTimers.set(normalizedPath, newTimer);
            resolve(false);
            return;
          }

          // Ejecutar script de procesamiento
          const args = [
            this.converterScript,
            '--input-file', filePath,
            '--output-dir', this.outputPath,
            '--radar-id', this.radarId,
            '--vmin', '10.0',
            '--vmax', '70.0',
            '--transparent-below', '8.0',
            '--cmap', 'meteorological'
          ];

          console.log(`[h5-watcher] Ejecutando: ${this.pythonCmd} ${args.join(' ')}`);

          const process = spawn(this.pythonCmd, args, {
            cwd: path.dirname(this.converterScript),
            stdio: ['ignore', 'pipe', 'pipe']
          });

          let stdout = '';
          let stderr = '';

          process.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          process.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          process.on('close', (code) => {
            this.processing.delete(normalizedPath);
            
            if (code === 0) {
              console.log(`[h5-watcher] ✓ Procesado exitosamente: ${filename}`);
              console.log(`[h5-watcher] Salida: ${stdout.substring(0, 200)}`);
              resolve(true);
            } else {
              console.error(`[h5-watcher] ✗ Error procesando ${filename} (código: ${code})`);
              console.error(`[h5-watcher] Error: ${stderr.substring(0, 500)}`);
              resolve(false);
            }
          });

          process.on('error', (error) => {
            this.processing.delete(normalizedPath);
            console.error(`[h5-watcher] Error ejecutando script: ${error.message}`);
            resolve(false);
          });

        } catch (error) {
          this.processing.delete(normalizedPath);
          console.error(`[h5-watcher] Error procesando ${path.basename(filePath)}:`, error.message);
          resolve(false);
        }
      }, this.debounceTime);

      this.debounceTimers.set(normalizedPath, timer);
    });
  }

  /**
   * Inicia el monitoreo del directorio
   */
  start() {
    if (!this.dataPath || !fs.existsSync(this.dataPath)) {
      console.error(`[h5-watcher] Directorio de datos no existe: ${this.dataPath}`);
      return false;
    }

    if (!fs.existsSync(this.converterScript)) {
      console.error(`[h5-watcher] Script de conversión no encontrado: ${this.converterScript}`);
      return false;
    }

    // Crear directorio de salida si no existe
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
      console.log(`[h5-watcher] Directorio de salida creado: ${this.outputPath}`);
    }

    console.log(`[h5-watcher] Iniciando monitoreo de H5 para ${this.radarId}`);
    console.log(`[h5-watcher] Directorio: ${this.dataPath}`);
    console.log(`[h5-watcher] Salida: ${this.outputPath}`);

    // Monitorear archivos .h5.gz
    this.watcher = chokidar.watch('**/*.h5.gz', {
      cwd: this.dataPath,
      ignored: /(^|[\/\\])\../, // Ignorar archivos ocultos
      persistent: true,
      ignoreInitial: false, // Procesar archivos existentes al inicio
      awaitWriteFinish: {
        stabilityThreshold: 3000, // Esperar 3 segundos de estabilidad
        pollInterval: 1000,
      },
    });

    this.watcher
      .on('add', (filePath) => {
        const fullPath = path.join(this.dataPath, filePath);
        this.processNewH5(fullPath).catch(err => {
          console.error(`[h5-watcher] Error en processNewH5:`, err);
        });
      })
      .on('change', (filePath) => {
        // También procesar si el archivo cambia (por si se reescribe)
        const fullPath = path.join(this.dataPath, filePath);
        this.processNewH5(fullPath).catch(err => {
          console.error(`[h5-watcher] Error en processNewH5:`, err);
        });
      })
      .on('error', (error) => {
        console.error(`[h5-watcher] Error del watcher:`, error);
      })
      .on('ready', () => {
        console.log(`[h5-watcher] Monitoreo activo. Esperando nuevos archivos H5...`);
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
      console.log(`[h5-watcher] Monitoreo detenido para ${this.radarId}`);
    }
    
    // Limpiar timers pendientes
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

module.exports = H5WatcherService;


