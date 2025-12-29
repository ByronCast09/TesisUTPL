-- Esquema básico para almacenar metadatos de productos de radar

CREATE TABLE IF NOT EXISTS radars (
  radar_id TEXT PRIMARY KEY,
  display_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS radar_products (
  id BIGSERIAL PRIMARY KEY,
  radar_id TEXT NOT NULL REFERENCES radars(radar_id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  png_data BYTEA,
  public_url TEXT,
  source_timestamp TIMESTAMPTZ,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size BIGINT,
  checksum TEXT,
  metadata JSONB,
  raw_source JSONB,
  status TEXT DEFAULT 'ready',
  UNIQUE (radar_id, product_type, source_timestamp, filename)
);

CREATE INDEX IF NOT EXISTS idx_radar_products_radar_ts
  ON radar_products (radar_id, source_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_radar_products_type_ts
  ON radar_products (product_type, source_timestamp DESC);

ALTER TABLE radar_products
  ADD COLUMN IF NOT EXISTS png_data BYTEA;


