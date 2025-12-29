require('dotenv').config();
const db = require('../services/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Análisis completo de seguridad y funcionamiento del sistema
 */
async function securityAudit() {
    const report = {
        timestamp: new Date().toISOString(),
        security: {},
        database: {},
        performance: {},
        optimizations: {},
        recommendations: []
    };

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ANÁLISIS DE SEGURIDAD Y RENDIMIENTO DEL SISTEMA          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // ==================== SEGURIDAD ====================
    console.log('🔒 ANÁLISIS DE SEGURIDAD\n');

    // 1. Variables de entorno sensibles
    report.security.envVars = {
        hasDBPassword: !!process.env.DB_PASSWORD,
        hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        hasRemotePassword: !!process.env.RADAR_PIPELINE_REMOTE_PASSWORD,
        nodeEnv: process.env.NODE_ENV || 'development'
    };

    if (process.env.NODE_ENV !== 'production') {
        console.log('⚠️  ADVERTENCIA: NODE_ENV no está en "production"');
        report.recommendations.push('Cambiar NODE_ENV=production en servidor real');
    } else {
        console.log('✓ NODE_ENV configurado correctamente');
    }

    // 2. Configuración de seguridad básica
    report.security.cors = {
        enabled: true, // CORS está habilitado en server.js
        message: 'CORS habilitado - permite peticiones desde cualquier origen'
    };
    console.log('⚠️  CORS permite cualquier origen (app.use(cors()))');
    report.recommendations.push('En producción, limitar CORS a dominios específicos');

    // 3. Rate Limiting
    report.security.rateLimit = {
        enabled: process.env.ENABLE_RATE_LIMIT !== 'false',
        maxRequests: Number(process.env.RATE_LIMIT_MAX || 100),
        window: Number(process.env.RATE_LIMIT_WINDOW || 15)
    };

    if (report.security.rateLimit.enabled) {
        console.log(`✓ Rate limiting activo: ${report.security.rateLimit.maxRequests} req/${report.security.rateLimit.window}min`);
    } else {
        console.log('❌ Rate limiting DESHABILITADO');
        report.recommendations.push('CRÍTICO: Habilitar rate limiting (ENABLE_RATE_LIMIT=true)');
    }

    // 4. Compresión HTTP
    report.security.compression = {
        enabled: process.env.ENABLE_COMPRESSION !== 'false',
        level: Number(process.env.COMPRESSION_LEVEL || 6)
    };
    console.log(report.security.compression.enabled ? '✓ Compresión HTTP activa' : '⚠️  Compresión deshabilitada');

    // ==================== BASE DE DATOS ====================
    console.log('\n📊 ANÁLISIS DE BASE DE DATOS\n');

    const pool = db.getPool();
    if (pool) {
        try {
            // Estadísticas del pool
            report.database.pool = {
                configured: true,
                max: pool.options.max || 'default',
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            };

            console.log(`✓ Connection Pool configurado:`);
            console.log(`  - Max conexiones: ${report.database.pool.max}`);
            console.log(`  - Conexiones activas: ${pool.totalCount}`);
            console.log(`  - Conexiones idle: ${pool.idleCount}`);
            console.log(`  - Peticiones esperando: ${pool.waitingCount}`);

            // Tamaño de la base de datos
            const sizeResult = await pool.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          pg_size_pretty(pg_total_relation_size('radar_products')) as table_size,
          pg_size_pretty(pg_indexes_size('radar_products')) as indexes_size
      `);

            report.database.size = sizeResult.rows[0];
            console.log(`\n✓ Tamaño de base de datos:`);
            console.log(`  - BD total: ${report.database.size.db_size}`);
            console.log(`  - Tabla radar_products: ${report.database.size.table_size}`);
            console.log(`  - Índices: ${report.database.size.indexes_size}`);

            // Contar registros
            const countResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready,
          COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as with_images,
          COUNT(CASE WHEN metadata::text LIKE '%maxDbz%' THEN 1 END) as with_metadata
        FROM radar_products
      `);

            report.database.records = countResult.rows[0];
            console.log(`\n✓ Registros en base de datos:`);
            console.log(`  - Total: ${report.database.records.total}`);
            console.log(`  - Ready: ${report.database.records.ready}`);
            console.log(`  - Con imágenes: ${report.database.records.with_images}`);
            console.log(`  - Con metadatos: ${report.database.records.with_metadata}`);

            const metadataPercentage = (report.database.records.with_metadata / report.database.records.total * 100).toFixed(1);
            if (metadataPercentage < 80) {
                report.recommendations.push(`Solo ${metadataPercentage}% de registros tienen metadatos. Ejecutar reprocess_all_metadata.js`);
            }

        } catch (error) {
            console.log(`❌ Error consultando BD: ${error.message}`);
            report.database.error = error.message;
        }
    } else {
        console.log('❌ Base de datos NO configurada');
        report.database.configured = false;
    }

    // ==================== RENDIMIENTO ====================
    console.log('\n⚡ ANÁLISIS DE RENDIMIENTO\n');

    // Memoria
    const memUsage = process.memoryUsage();
    report.performance.memory = {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
    };

    console.log(`✓ Uso de memoria:`);
    console.log(`  - RSS: ${report.performance.memory.rss}`);
    console.log(`  - Heap usado: ${report.performance.memory.heapUsed}`);
    console.log(`  - Heap total: ${report.performance.memory.heapTotal}`);

    if (memUsage.heapUsed / memUsage.heapTotal > 0.9) {
        console.log('⚠️  Uso de memoria alto (>90%)');
        report.recommendations.push('Memoria alta - considerar reiniciar servidor o aumentar límites');
    }

    // Uptime
    const uptimeHours = (process.uptime() / 3600).toFixed(2);
    report.performance.uptime = `${uptimeHours} horas`;
    console.log(`\n✓ Uptime: ${report.performance.uptime}`);

    if (process.uptime() > 7 * 24 * 3600) {
        report.recommendations.push('Servidor corriendo más de 7 días - considerar reinicio preventivo');
    }

    // ==================== OPTIMIZACIONES ====================
    console.log('\n🚀 OPTIMIZACIONES ACTIVAS\n');

    report.optimizations = {
        connectionPool: {
            enabled: !!pool,
            max: pool?.options?.max || 'N/A'
        },
        compression: {
            enabled: process.env.ENABLE_COMPRESSION !== 'false',
            level: Number(process.env.COMPRESSION_LEVEL || 6)
        },
        rateLimit: {
            enabled: process.env.ENABLE_RATE_LIMIT !== 'false',
            max: Number(process.env.RATE_LIMIT_MAX || 100)
        },
        imageCache: {
            enabled: process.env.ENABLE_IMAGE_CACHE !== 'false',
            maxSize: process.env.IMAGE_CACHE_MAX_SIZE || '500MB'
        }
    };

    console.log(`${report.optimizations.connectionPool.enabled ? '✓' : '❌'} Connection Pool`);
    console.log(`${report.optimizations.compression.enabled ? '✓' : '❌'} Compresión HTTP`);
    console.log(`${report.optimizations.rateLimit.enabled ? '✓' : '❌'} Rate Limiting`);
    console.log(`${report.optimizations.imageCache.enabled ? '✓' : '❌'} Caché de Imágenes`);

    // ==================== ARCHIVOS SENSIBLES ====================
    console.log('\n🔐 VERIFICACIÓN DE ARCHIVOS SENSIBLES\n');

    const sensitiveFiles = [
        '.env',
        'firebase-key.json',
    ];

    for (const file of sensitiveFiles) {
        try {
            await fs.access(path.join(__dirname, '..', file));
            console.log(`⚠️  ${file} existe (NO debe estar en git)`);
            report.recommendations.push(`Verificar que ${file} esté en .gitignore`);
        } catch {
            // File doesn't exist, that's ok
        }
    }

    // Verificar .gitignore
    try {
        const gitignore = await fs.readFile(path.join(__dirname, '../..', '.gitignore'), 'utf-8');
        const hasEnv = gitignore.includes('.env');
        const hasFirebase = gitignore.includes('firebase');

        if (!hasEnv) {
            console.log('❌ .gitignore NO incluye .env');
            report.recommendations.push('CRÍTICO: Agregar .env a .gitignore');
        } else {
            console.log('✓ .gitignore incluye .env');
        }
    } catch {
        console.log('⚠️  No se encontró .gitignore');
        report.recommendations.push('Crear archivo .gitignore con archivos sensibles');
    }

    // ==================== RESUMEN Y RECOMENDACIONES ====================
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  RESUMEN Y RECOMENDACIONES                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (report.recommendations.length === 0) {
        console.log('✅ No se encontraron problemas de seguridad o rendimiento');
    } else {
        console.log(`⚠️  ${report.recommendations.length} recomendaciones encontradas:\n`);
        report.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
    }

    // Guardar reporte
    const reportPath = path.join(__dirname, '..', 'security-audit-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✓ Reporte guardado en: ${reportPath}`);

    return report;
}

// Ejecutar
if (require.main === module) {
    securityAudit()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}

module.exports = { securityAudit };
