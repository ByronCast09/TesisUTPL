require('dotenv').config();
const db = require('../services/db');

/**
 * Ejecuta los índices de optimización para mejorar el rendimiento
 * con múltiples usuarios simultáneos
 */
async function optimizeIndexes() {
  console.log('[Optimización BD] Iniciando creación de índices optimizados...');

  const pool = db.getPool();
  if (!pool) {
    console.error('[Optimización BD] PostgreSQL no está configurado');
    return false;
  }

  try {
    // Índice compuesto para consultas del visor
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_radar_products_radar_ts_optimized 
        ON radar_products(radar_id, source_timestamp DESC) 
        WHERE status = 'ready'
    `);
    console.log('[Optimización BD] ✓ Índice radar_ts_optimized creado');

    // Índice para búsquedas por filename
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_radar_products_filename 
        ON radar_products(radar_id, filename)
    `);
    console.log('[Optimización BD] ✓ Índice por filename creado');

    // Índice para product_type + timestamp
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_radar_products_type_ts_optimized
        ON radar_products(product_type, source_timestamp DESC)
        WHERE status = 'ready'
    `);
    console.log('[Optimización BD] ✓ Índice type_ts_optimized creado');

    // Índice especial para el visor
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_radar_products_viewer
        ON radar_products(radar_id, source_timestamp DESC, id)
        WHERE status = 'ready' AND png_data IS NOT NULL
    `);
    console.log('[Optimización BD] ✓ Índice para visor creado');

    // Actualizar estadísticas
    await pool.query('ANALYZE radar_products');
    console.log('[Optimización BD] ✓ Estadísticas actualizadas');

    // Mostrar información de índices
    const result = await pool.query(`
      SELECT 
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND relname = 'radar_products'
      ORDER BY pg_relation_size(indexrelid) DESC
    `);

    console.log('[Optimización BD] Índices creados:');
    result.rows.forEach(row => {
      console.log(`  - ${row.index_name}: ${row.index_size}`);
    });

    console.log('[Optimización BD] ✅ Optimización completada exitosamente');
    return true;

  } catch (error) {
    console.error('[Optimización BD] ❌ Error:', error.message);
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  optimizeIndexes()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { optimizeIndexes };
