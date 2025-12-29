const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

/**
 * Servicio para monitorear archivos PPI y convertirlos automáticamente a PNG
 */
class PPIWatcherService {
  constructor(config = {}) {
    this.dataPath = config.dataPath || process.env.PPI_DATA_PATH;
    this.outputPath = config.outputPath || process.env.PPI_OUTPUT_PATH;
    this.radarId = config.radarId || 'LGUAXX';
    this.dbUrl = config.dbUrl || process.env.DATABASE_URL || this.buildDbUrl();
    this.pythonCmd = config.pythonCmd || process.env.PYTHON_CMD || 'python';
    this.converterScript = config.converterScript || path.join(__dirname, '../../scripts/advanced_ppi_converter.py');
    this.watcher = null;
    this.processing = new Set(); // Evitar procesar el mismo archivo múltiples veces
    this.debounceTime = config.debounceTime || 5000; // Esperar 5 segundos antes de procesar
    this.debounceTimers = new Map();
  }

  buildDbUrl() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'radar_metadata';
    return `postgres://${user}:${password}@${host}:${port}/${dbName}`;
  }

  /**
   * Ejecuta el conversor de PPI a PNG
   */
  async runConverter(dateFolder = null) {
    const args = [
      this.converterScript,
      '--data-path', this.dataPath,
      '--output-path', this.outputPath,
      '--radar-id', this.radarId,
      '--db-url', this.dbUrl,
    ];

    // Si se especifica una carpeta de fecha, procesar solo esa
    if (dateFolder) {
      const fullPath = path.join(this.dataPath, dateFolder);
      if (fs.existsSync(fullPath)) {
        args[1] = '--data-path';
        args[2] = fullPath;
      }
    }

    return new Promise((resolve, reject) => {
      console.log(`[ppi-watcher] Ejecutando conversor para ${this.radarId}...`);
      console.log(`[ppi-watcher] Comando: ${this.pythonCmd} ${args.join(' ')}`);

      const proc = spawn(this.pythonCmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        process.stdout.write(`[ppi-converter] ${text}`);
      });

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        process.stderr.write(`[ppi-converter] ${text}`);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`[ppi-watcher] Conversión completada exitosamente`);
          resolve({ stdout, stderr });
        } else {
          console.error(`[ppi-watcher] Conversión falló con código ${code}`);
          reject(new Error(`Conversor falló: ${stderr || stdout}`));
        }
      });

      proc.on('error', (error) => {
        console.error(`[ppi-watcher] Error ejecutando conversor:`, error);
        reject(error);
      });
    });
  }

  /**
   * Procesa un archivo PPI nuevo
   */
  async processNewPPI(filePath) {
    const normalizedPath = path.normalize(filePath);
    
    // Evitar procesar el mismo archivo múltiples veces
    if (this.processing.has(normalizedPath)) {
      console.log(`[ppi-watcher] ${path.basename(filePath)} ya está siendo procesado, omitiendo...`);
      return;
    }

    // Cancelar timer de debounce si existe
    if (this.debounceTimers.has(normalizedPath)) {
      clearTimeout(this.debounceTimers.get(normalizedPath));
    }

    // Esperar un poco antes de procesar (debounce)
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(normalizedPath);
        this.processing.add(normalizedPath);

        try {
          console.log(`[ppi-watcher] Procesando nuevo archivo PPI: ${path.basename(filePath)}`);
          
          // Extraer carpeta de fecha si existe
          const relativePath = path.relative(this.dataPath, filePath);
          const dateFolder = relativePath.split(path.sep)[0];
          
          // Ejecutar conversor
          await this.runConverter(dateFolder || null);
          
          console.log(`[ppi-watcher] ✓ Archivo procesado: ${path.basename(filePath)}`);
          resolve();
        } catch (error) {
          console.error(`[ppi-watcher] ✗ Error procesando ${path.basename(filePath)}:`, error.message);
          resolve(); // Resolver para no bloquear otros archivos
        } finally {
          this.processing.delete(normalizedPath);
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
      console.error(`[ppi-watcher] Directorio de datos no existe: ${this.dataPath}`);
      return false;
    }

    if (!fs.existsSync(this.converterScript)) {
      console.error(`[ppi-watcher] Script de conversión no encontrado: ${this.converterScript}`);
      return false;
    }

    console.log(`[ppi-watcher] Iniciando monitoreo de PPI para ${this.radarId}`);
    console.log(`[ppi-watcher] Directorio: ${this.dataPath}`);
    console.log(`[ppi-watcher] Salida: ${this.outputPath}`);

    // Monitorear archivos .ppi
    this.watcher = chokidar.watch('**/*.ppi', {
      cwd: this.dataPath,
      ignored: /(^|[\/\\])\../, // Ignorar archivos ocultos
      persistent: true,
      ignoreInitial: false, // Procesar archivos existentes al inicio
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Esperar 2 segundos de estabilidad
        pollInterval: 1000,
      },
    });

    this.watcher
      .on('add', (filePath) => {
        const fullPath = path.join(this.dataPath, filePath);
        this.processNewPPI(fullPath).catch(err => {
          console.error(`[ppi-watcher] Error en processNewPPI:`, err);
        });
      })
      .on('change', (filePath) => {
        // También procesar si el archivo cambia (por si se reescribe)
        const fullPath = path.join(this.dataPath, filePath);
        this.processNewPPI(fullPath).catch(err => {
          console.error(`[ppi-watcher] Error en processNewPPI:`, err);
        });
      })
      .on('error', (error) => {
        console.error(`[ppi-watcher] Error del watcher:`, error);
      })
      .on('ready', () => {
        console.log(`[ppi-watcher] Monitoreo activo. Esperando nuevos archivos PPI...`);
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
      console.log(`[ppi-watcher] Monitoreo detenido`);
    }

    // Limpiar timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.processing.clear();
  }
}

module.exports = PPIWatcherService;

