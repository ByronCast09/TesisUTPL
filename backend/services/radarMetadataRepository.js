const fs = require('fs');
const path = require('path');
const db = require('./db');

const DEFAULT_PRODUCT_TYPE = 'ppi_png';
const STORE_PNG_IN_DB = (() => {
  const raw = String(process.env.STORE_PNG_IN_DB || process.env.DB_STORE_PNG || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
})();

const BASE_SELECT_COLUMNS = `
  id,
  radar_id,
  product_type,
  filename,
  storage_path,
  public_url,
  source_timestamp,
  processed_at,
  file_size,
  checksum,
  metadata,
  raw_source,
  status,
  png_data
`;

const CREATE_TABLES = [
  `
  CREATE TABLE IF NOT EXISTS radars (
    radar_id TEXT PRIMARY KEY,
    display_name TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  `,
  `
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
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_radar_products_radar_ts
    ON radar_products (radar_id, source_timestamp DESC);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_radar_products_type_ts
    ON radar_products (product_type, source_timestamp DESC);
  `,
  `
  ALTER TABLE radar_products
    ADD COLUMN IF NOT EXISTS png_data BYTEA;
  `,
];

async function ensureSchema() {
  if (!db.isConfigured()) {
    return false;
  }
  await db.initialize();
  for (const statement of CREATE_TABLES) {
    await db.query(statement);
  }
  return true;
}

async function upsertRadar(radarId, { displayName, description } = {}) {
  if (!db.isConfigured()) {
    return null;
  }
  const text = `
    INSERT INTO radars (radar_id, display_name, description, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (radar_id)
    DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, radars.display_name),
      description = COALESCE(EXCLUDED.description, radars.description),
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [radarId, displayName || null, description || null];
  const result = await db.query(text, values);
  return result?.rows?.[0] || null;
}

function normalizeEntry(entry) {
  if (!entry) {
    return null;
  }

  const { radarId, timestamp, local, metadata, source } = entry;
  const sourceTimestamp = metadata?.sourceTimestamp || timestamp || metadata?.timestamp || null;
  const displayName = metadata?.radarName || metadata?.radar || radarId;
  const description = metadata?.description || null;
  const productType = metadata?.productType || metadata?.product || DEFAULT_PRODUCT_TYPE;
  const pngPath = local?.png;
  let pngBuffer = null;
  if (STORE_PNG_IN_DB && pngPath) {
    try {
      pngBuffer = fs.readFileSync(pngPath);
    } catch (err) {
      console.warn(`No se pudo leer PNG para almacenamiento en DB (${pngPath}):`, err.message);
    }
  }
  const publicUrl = local?.publicPng;
  const jsonMetadata = metadata ? { ...metadata } : {};

  if (jsonMetadata?.sourceTimestamp === undefined && sourceTimestamp) {
    jsonMetadata.sourceTimestamp = sourceTimestamp;
  }
  if (jsonMetadata?.productType === undefined) {
    jsonMetadata.productType = productType;
  }

  const fileName = pngPath ? path.basename(pngPath) : metadata?.fileName || metadata?.filename || null;

  return {
    radarId,
    productType,
    fileName,
    storagePath: pngPath || null,
    pngBuffer,
    publicUrl: publicUrl || null,
    sourceTimestamp,
    metadata: jsonMetadata,
    rawSource: source || null,
  };
}

async function registerProcessedEntry(entry) {
  if (!db.isConfigured()) {
    return null;
  }
  const normalized = normalizeEntry(entry);
  if (!normalized || !normalized.radarId || !normalized.fileName) {
    return null;
  }

  await upsertRadar(normalized.radarId, {
    displayName: normalized.metadata?.radarName,
  });

  const queryText = `
    INSERT INTO radar_products (
      radar_id,
      product_type,
      filename,
      storage_path,
      png_data,
      public_url,
      source_timestamp,
      processed_at,
      file_size,
      checksum,
      metadata,
      raw_source,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12)
    ON CONFLICT (radar_id, product_type, source_timestamp, filename)
    DO UPDATE SET
      storage_path = EXCLUDED.storage_path,
      png_data = CASE 
        WHEN EXCLUDED.png_data IS NOT NULL THEN EXCLUDED.png_data 
        ELSE radar_products.png_data 
      END,
      public_url = EXCLUDED.public_url,
      file_size = COALESCE(EXCLUDED.file_size, radar_products.file_size),
      checksum = COALESCE(EXCLUDED.checksum, radar_products.checksum),
      metadata = COALESCE(EXCLUDED.metadata, radar_products.metadata),
      raw_source = COALESCE(EXCLUDED.raw_source, radar_products.raw_source),
      status = COALESCE(EXCLUDED.status, radar_products.status),
      processed_at = NOW()
    RETURNING *
  `;

  const stats = {};
  try {
    if (normalized.storagePath) {
      const fs = require('fs');
      const fileStats = fs.statSync(normalized.storagePath);
      stats.fileSize = fileStats.size;
    }
  } catch (err) {
    stats.fileSize = null;
  }

  const values = [
    normalized.radarId,
    normalized.productType,
    normalized.fileName,
    normalized.storagePath,
    normalized.pngBuffer || null,
    normalized.publicUrl,
    normalized.sourceTimestamp,
    stats.fileSize || null,
    normalized.metadata?.checksum || null,
    normalized.metadata ? JSON.stringify(normalized.metadata) : null,
    normalized.rawSource ? JSON.stringify(normalized.rawSource) : null,
    'ready',
  ];

  const result = await db.query(queryText, values);
  return result?.rows?.[0] || null;
}

async function recordProcessedFile({
  radarId,
  productType = DEFAULT_PRODUCT_TYPE,
  timestamp,
  storagePath,
  pngBuffer,
  publicUrl,
  metadata,
  rawSource,
  status = 'ready',
  fileSize,
  checksum,
  filename,
}) {
  if (!db.isConfigured()) {
    return null;
  }

  const finalFilename = filename || (storagePath ? path.basename(storagePath) : null);
  if (!radarId || !finalFilename || !storagePath) {
    throw new Error('Se requieren radarId, filename y storagePath para registrar un archivo procesado');
  }

  await upsertRadar(radarId, {
    displayName: metadata?.radarName,
    description: metadata?.radarDescription,
  });

  let finalPngBuffer = pngBuffer || null;
  if (!finalPngBuffer && STORE_PNG_IN_DB && storagePath) {
    try {
      finalPngBuffer = fs.readFileSync(storagePath);
    } catch (err) {
      console.warn(`No se pudo leer PNG en recordProcessedFile (${storagePath}):`, err.message);
    }
  }

  let result;
  try {
    result = await db.query(
      `
    INSERT INTO radar_products (
      radar_id,
      product_type,
      filename,
      storage_path,
      png_data,
      public_url,
      source_timestamp,
      processed_at,
      file_size,
      checksum,
      metadata,
      raw_source,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11, $12)
    ON CONFLICT (radar_id, product_type, source_timestamp, filename)
    DO UPDATE SET
      storage_path = EXCLUDED.storage_path,
      png_data = CASE 
        WHEN EXCLUDED.png_data IS NOT NULL THEN EXCLUDED.png_data 
        ELSE radar_products.png_data 
      END,
      public_url = EXCLUDED.public_url,
      file_size = COALESCE(EXCLUDED.file_size, radar_products.file_size),
      checksum = COALESCE(EXCLUDED.checksum, radar_products.checksum),
      metadata = COALESCE(EXCLUDED.metadata, radar_products.metadata),
      raw_source = COALESCE(EXCLUDED.raw_source, radar_products.raw_source),
      status = COALESCE(EXCLUDED.status, radar_products.status),
      processed_at = NOW()
    RETURNING *
    `,
      [
        radarId,
        productType,
        finalFilename,
        storagePath,
        finalPngBuffer || null,
        publicUrl,
        timestamp || null,
        fileSize || null,
        checksum || null,
        metadata ? JSON.stringify(metadata) : null,
        rawSource ? JSON.stringify(rawSource) : null,
        status || 'ready',
      ],
    );
  } catch (error) {
    console.error(`[radarMetadataRepository] ❌ Error guardando en PostgreSQL:`, error.message);
    console.error(`[radarMetadataRepository] Detalles:`, { radarId, filename: finalFilename, timestamp });
    throw error;  // Re-lanzar para que se vea el error
  }

  return result?.rows?.[0] || null;
}

async function listProcessed({ radarId, productType, limit = 200, from, to } = {}) {
  if (!db.isConfigured()) {
    return [];
  }
  const conditions = [];
  const values = [];

  if (radarId) {
    conditions.push(`radar_id = $${conditions.length + 1}`);
    values.push(radarId);
  }
  if (productType) {
    conditions.push(`product_type = $${conditions.length + 1}`);
    values.push(productType);
  }
  if (from) {
    conditions.push(`source_timestamp >= $${conditions.length + 1}`);
    values.push(new Date(from));
  }
  if (to) {
    conditions.push(`source_timestamp <= $${conditions.length + 1}`);
    values.push(new Date(to));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  // Aumentar límite máximo a 50000 para permitir más fechas
  const limitValue = Math.min(Math.max(Number(limit) || 50, 1), 50000);
  const queryText = `
    SELECT ${BASE_SELECT_COLUMNS}
    FROM radar_products
    ${whereClause}
    ORDER BY source_timestamp DESC NULLS LAST, processed_at DESC
    LIMIT ${limitValue};
  `;

  const result = await db.query(queryText, values);
  return result?.rows || [];
}

async function getLatest(radarId, productType = DEFAULT_PRODUCT_TYPE) {
  if (!db.isConfigured()) {
    return null;
  }
  const result = await db.query(
    `
      SELECT ${BASE_SELECT_COLUMNS}
      FROM radar_products
      WHERE radar_id = $1 AND product_type = $2
      ORDER BY source_timestamp DESC NULLS LAST, processed_at DESC
      LIMIT 1;
    `,
    [radarId, productType],
  );
  return result?.rows?.[0] || null;
}

async function getById(id) {
  if (!db.isConfigured()) {
    return null;
  }
  const result = await db.query(
    `
      SELECT ${BASE_SELECT_COLUMNS}
      FROM radar_products
      WHERE id = $1;
    `,
    [id],
  );
  return result?.rows?.[0] || null;
}

async function getImageBufferById(id) {
  if (!db.isConfigured()) {
    return null;
  }
  const result = await db.query(
    `
      SELECT png_data
      FROM radar_products
      WHERE id = $1;
    `,
    [id],
  );
  const buffer = result?.rows?.[0]?.png_data || null;
  return buffer;
}

async function listRadars() {
  if (!db.isConfigured()) {
    return [];
  }
  const result = await db.query(
    `
      SELECT radar_id, display_name, description, created_at, updated_at
      FROM radars
      ORDER BY radar_id ASC;
    `,
  );
  return result?.rows || [];
}

async function getAvailableDates(radarId, productType = DEFAULT_PRODUCT_TYPE) {
  if (!db.isConfigured()) {
    return [];
  }
  const result = await db.query(
    `
      SELECT DISTINCT TO_CHAR(source_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
      FROM radar_products
      WHERE radar_id = $1 
        AND product_type = $2 
        AND source_timestamp IS NOT NULL
        AND png_data IS NOT NULL
      ORDER BY date ASC;
    `,
    [radarId, productType],
  );
  return result?.rows?.map((row) => row.date) || [];
}

async function summarizeByRadar() {
  if (!db.isConfigured()) {
    return [];
  }
  const result = await db.query(
    `
      SELECT
        r.radar_id,
        r.display_name,
        COUNT(p.id) AS products_count,
        MIN(p.source_timestamp) AS first_timestamp,
        MAX(p.source_timestamp) AS last_timestamp
      FROM radars r
      LEFT JOIN radar_products p
        ON p.radar_id = r.radar_id
      GROUP BY r.radar_id, r.display_name
      ORDER BY r.radar_id;
    `,
  )
  return result?.rows || [];
}

/**
 * Busca una imagen por filename y radarId
 */
async function findByFilename(radarId, filename) {
  const result = await pool.query(
    `SELECT * FROM radar_metadata 
     WHERE radar_id = $1 AND filename = $2 
     LIMIT 1`,
    [radarId, filename]
  );
  return result?.rows?.[0] || null;
}

/**
 * Update an existing radar product record
 */
async function update(id, updates) {
  const updateFields = [];
  const values = [];
  let paramCounter = 1;

  if (updates.metadata !== undefined) {
    updateFields.push(`metadata = $${paramCounter}`);
    values.push(JSON.stringify(updates.metadata));
    paramCounter++;
  }

  if (updates.status !== undefined) {
    updateFields.push(`status = $${paramCounter}`);
    values.push(updates.status);
    paramCounter++;
  }

  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(id);

  const query = `
    UPDATE radar_products
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCounter}
    RETURNING *
  `;

  const result = await db.query(query, values);
  return result.rows[0];
}

module.exports = {
  ensureSchema,
  upsertRadar,
  registerProcessedEntry,
  recordProcessedFile,
  listProcessed,
  getLatest,
  getById,
  getImageBufferById,
  findByFilename,
  listRadars,
  getAvailableDates,
  summarizeByRadar,
  update,
  DEFAULT_PRODUCT_TYPE,
};
