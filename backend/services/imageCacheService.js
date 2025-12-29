const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Servicio de caché de imágenes en sistema de archivos
 * Mejora el rendimiento evitando leer de PostgreSQL repetidamente
 */
class ImageCacheService {
    constructor(options = {}) {
        this.baseDir = options.baseDir || path.join(__dirname, '../storage/image-cache');
        this.maxAge = options.maxAge || 24 * 60 * 60 * 1000; // 24 horas por defecto
        this.maxSizeBytes = options.maxSizeBytes || 500 * 1024 * 1024; // 500MB por defecto
        this.enabled = options.enabled !== false;

        this.stats = {
            hits: 0,
            misses: 0,
            saves: 0,
            errors: 0
        };
    }

    /**
     * Inicializa el directorio de caché
     */
    async initialize() {
        if (!this.enabled) {
            console.log('[ImageCache] Caché deshabilitado');
            return false;
        }

        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            console.log(`[ImageCache] ✓ Inicializado en ${this.baseDir}`);
            return true;
        } catch (error) {
            console.error('[ImageCache] Error inicializando:', error.message);
            this.enabled = false;
            return false;
        }
    }

    /**
     * Genera clave única para una imagen
     */
    generateKey(id, filename) {
        const hash = crypto.createHash('md5').update(`${id}_${filename}`).digest('hex');
        return hash.substring(0, 16);
    }

    /**
     * Obtiene la ruta completa del archivo en caché
     */
    getCachePath(key) {
        // Usar subdirectorios para no saturar un solo directorio
        const subdir = key.substring(0, 2);
        return path.join(this.baseDir, subdir, `${key}.png`);
    }

    /**
     * Verifica si una imagen está en caché y es válida
     */
    async has(id, filename) {
        if (!this.enabled) return false;

        const key = this.generateKey(id, filename);
        const cachePath = this.getCachePath(key);

        try {
            const stats = await fs.stat(cachePath);
            const age = Date.now() - stats.mtimeMs;

            // Verificar que no haya expirado
            if (age < this.maxAge) {
                return true;
            } else {
                // Eliminar si expiró
                await fs.unlink(cachePath).catch(() => { });
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene una imagen desde el caché
     */
    async get(id, filename) {
        if (!this.enabled) return null;

        const key = this.generateKey(id, filename);
        const cachePath = this.getCachePath(key);

        try {
            const stats = await fs.stat(cachePath);
            const age = Date.now() - stats.mtimeMs;

            // Verificar que no haya expirado
            if (age >= this.maxAge) {
                await fs.unlink(cachePath).catch(() => { });
                this.stats.misses++;
                return null;
            }

            const buffer = await fs.readFile(cachePath);
            this.stats.hits++;

            return buffer;
        } catch (error) {
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Guarda una imagen en el caché
     */
    async set(id, filename, buffer) {
        if (!this.enabled || !buffer) return false;

        const key = this.generateKey(id, filename);
        const cachePath = this.getCachePath(key);

        try {
            // Crear subdirectorio si no existe
            const dir = path.dirname(cachePath);
            await fs.mkdir(dir, { recursive: true });

            // Guardar imagen
            await fs.writeFile(cachePath, buffer);
            this.stats.saves++;

            // Limpiar caché si es necesario (async, no bloqueante)
            this.cleanupIfNeeded().catch(() => { });

            return true;
        } catch (error) {
            this.stats.errors++;
            console.error('[ImageCache] Error guardando:', error.message);
            return false;
        }
    }

    /**
     * Limpia el caché si supera el tamaño máximo
     */
    async cleanupIfNeeded() {
        try {
            const size = await this.getCacheSize();

            if (size > this.maxSizeBytes) {
                console.log(`[ImageCache] Limpiando caché (${(size / 1024 / 1024).toFixed(2)} MB)`);
                await this.cleanup();
            }
        } catch (error) {
            console.error('[ImageCache] Error en cleanup:', error.message);
        }
    }

    /**
     * Calcula el tamaño total del caché
     */
    async getCacheSize() {
        let totalSize = 0;

        async function getSize(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    totalSize += await getSize(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                }
            }

            return totalSize;
        }

        try {
            return await getSize(this.baseDir);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Elimina archivos antiguos del caché
     */
    async cleanup() {
        const files = [];

        async function collectFiles(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await collectFiles(fullPath);
                } else {
                    const stats = await fs.stat(fullPath);
                    files.push({ path: fullPath, mtime: stats.mtimeMs });
                }
            }
        }

        try {
            await collectFiles(this.baseDir);

            // Ordenar por antigüedad
            files.sort((a, b) => a.mtime - b.mtime);

            // Eliminar el 30% más antiguo
            const toDelete = Math.floor(files.length * 0.3);

            for (let i = 0; i < toDelete; i++) {
                await fs.unlink(files[i].path).catch(() => { });
            }

            console.log(`[ImageCache] ✓ Eliminados ${toDelete} archivos antiguos`);
        } catch (error) {
            console.error('[ImageCache] Error en cleanup:', error.message);
        }
    }

    /**
     * Limpia todo el caché
     */
    async clear() {
        try {
            await fs.rm(this.baseDir, { recursive: true, force: true });
            await fs.mkdir(this.baseDir, { recursive: true });
            console.log('[ImageCache] ✓ Caché limpiado completamente');

            // Resetear estadísticas
            this.stats = {
                hits: 0,
                misses: 0,
                saves: 0,
                errors: 0
            };

            return true;
        } catch (error) {
            console.error('[ImageCache] Error limpiando caché:', error.message);
            return false;
        }
    }

    /**
     * Obtiene estadísticas del caché
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            enabled: this.enabled
        };
    }
}

// Singleton
const imageCacheService = new ImageCacheService({
    enabled: process.env.ENABLE_IMAGE_CACHE !== 'false',
    maxAge: Number(process.env.IMAGE_CACHE_MAX_AGE || 24 * 60 * 60 * 1000), // 24h
    maxSizeBytes: Number(process.env.IMAGE_CACHE_MAX_SIZE || 500 * 1024 * 1024) // 500MB
});

module.exports = imageCacheService;
