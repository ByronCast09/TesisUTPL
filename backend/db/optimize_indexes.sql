-- ====================================
-- ÍNDICES OPTIMIZADOS PARA MÚLTIPLES USUARIOS
-- ====================================
-- Ejecuta este script para mejorar el rendimiento de consultas frecuentes

-- Índice compuesto para consultas del visor (radar_id + timestamp descendente)
CREATE INDEX IF NOT EXISTS idx_radar_products_radar_ts_optimized 
  ON radar_products(radar_id, source_timestamp DESC) 
  WHERE status = 'ready';

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_radar_products_date 
  ON radar_products(radar_id, DATE(source_timestamp));

-- Índice para búsquedas por filename
CREATE INDEX IF NOT EXISTS idx_radar_products_filename 
  ON radar_products(radar_id, filename);

-- Índice para product_type + timestamp
CREATE INDEX IF NOT EXISTS idx_radar_products_type_ts_optimized
  ON radar_products(product_type, source_timestamp DESC)
  WHERE status = 'ready';

-- Índice para el visor (queries más rápidas)
CREATE INDEX IF NOT EXISTS idx_radar_products_viewer
  ON radar_products(radar_id, source_timestamp DESC, id)
  WHERE status = 'ready' AND png_data IS NOT NULL;

-- Actualizar estadísticas de la tabla para el query planner
ANALYZE radar_products;

-- Ver información de índices creados
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'radar_products'
ORDER BY indexname;

-- Ver tamaño de los índices
SELECT
  indexrelname as index_name,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname = 'radar_products'
ORDER BY pg_relation_size(indexrelid) DESC;
