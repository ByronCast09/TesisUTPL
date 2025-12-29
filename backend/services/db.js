const { Pool } = require('pg');

let pool = null;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function buildConfig() {
  if (process.env.DATABASE_URL) {
    const config = {
      connectionString: process.env.DATABASE_URL,
      // Configuración optimizada del pool para múltiples usuarios
      max: Number(process.env.DB_POOL_MAX || 50),
      min: Number(process.env.DB_POOL_MIN || 5),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 30000),
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT || 5000),
      maxUses: Number(process.env.DB_POOL_MAX_USES || 7500),
    };
    if (parseBoolean(process.env.DB_SSL, false)) {
      config.ssl = {
        rejectUnauthorized: !parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
      };
    }
    return config;
  }

  const host = process.env.DB_HOST;
  if (!host) {
    return null;
  }

  const config = {
    host,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Configuración optimizada del pool para múltiples usuarios
    max: Number(process.env.DB_POOL_MAX || 50),
    min: Number(process.env.DB_POOL_MIN || 5),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT || 5000),
    maxUses: Number(process.env.DB_POOL_MAX_USES || 7500),
  };

  if (parseBoolean(process.env.DB_SSL, false)) {
    config.ssl = {
      rejectUnauthorized: !parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
    };
  }

  return config;
}

function isConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.DB_HOST);
}

function getPool() {
  if (!isConfigured()) {
    return null;
  }
  if (!pool) {
    const config = buildConfig();
    pool = new Pool(config);

    // Event listeners para monitoreo del pool
    pool.on('error', (err) => {
      console.error('[DB Pool] Error inesperado:', err.message);
    });

    pool.on('connect', () => {
      console.log('[DB Pool] Nueva conexión establecida');
    });

    pool.on('acquire', () => {
      console.log('[DB Pool] Cliente adquirido del pool');
    });

    pool.on('remove', () => {
      console.log('[DB Pool] Cliente removido del pool');
    });

    console.log(`[DB Pool] Inicializado con max=${config.max}, min=${config.min}`);
  }
  return pool;
}

async function initialize() {
  if (!isConfigured()) {
    console.warn('Postgres no configurado. Saltando initialización de DB.');
    return false;
  }
  const pgPool = getPool();
  await pgPool.query('SELECT 1;');
  console.log('Conexión a Postgres verificada.');
  return true;
}

async function query(text, params) {
  const pgPool = getPool();
  if (!pgPool) {
    return null;
  }
  return pgPool.query(text, params);
}

async function withClient(callback) {
  const pgPool = getPool();
  if (!pgPool) {
    throw new Error('Postgres no está configurado');
  }
  const client = await pgPool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

module.exports = {
  initialize,
  isConfigured,
  query,
  withClient,
  getPool,
};


