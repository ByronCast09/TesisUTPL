const db = require('../services/db');
const imageCacheService = require('../services/imageCacheService');

/**
 * Health Check Endpoint
 * Verifica el estado del sistema y sus optimizaciones
 */
async function getHealth(req, res) {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        optimizations: {
            compression: process.env.ENABLE_COMPRESSION !== 'false',
            rateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
            imageCache: process.env.ENABLE_IMAGE_CACHE !== 'false',
            connectionPool: {
                enabled: true,
                max: Number(process.env.DB_POOL_MAX || 50),
                min: Number(process.env.DB_POOL_MIN || 5)
            }
        },
        cache: imageCacheService.getStats(),
        database: {
            configured: false,
            connected: false,
            poolStats: null
        }
    };

    // Verificar conexión a PostgreSQL
    try {
        const pool = db.getPool();
        if (pool) {
            health.database.configured = true;

            // Intentar query simple
            await pool.query('SELECT 1');
            health.database.connected = true;

            // Stats del pool
            health.database.poolStats = {
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            };
        }
    } catch (error) {
        health.status = 'degraded';
        health.database.error = error.message;
    }

    // Determinar código de estado HTTP
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(health);
}

/**
 * Estadísticas detalladas del sistema
 */
async function getStats(req, res) {
    const stats = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cache: imageCacheService.getStats()
    };

    // Pool stats
    try {
        const pool = db.getPool();
        if (pool) {
            stats.database = {
                totalConnections: pool.totalCount,
                idleConnections: pool.idleCount,
                waitingRequests: pool.waitingCount
            };
        }
    } catch (error) {
        stats.database = { error: error.message };
    }

    res.json(stats);
}

/**
 * Limpia el caché de imágenes manualmente
 */
async function clearCache(req, res) {
    try {
        const success = await imageCacheService.clear();

        if (success) {
            res.json({
                success: true,
                message: 'Caché limpiado exitosamente'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error limpiando caché'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    getHealth,
    getStats,
    clearCache
};
