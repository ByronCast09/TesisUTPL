const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_db',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
});

async function checkSpecificDate() {
    try {
        await client.connect();

        console.log('Verificando registros para el 12 de Noviembre de 2025...');

        const query = `
      SELECT id, filename, processed_at, metadata
      FROM radar_products 
      WHERE radar_id = 'LOXX' 
      AND (filename LIKE '%20251112%' OR filename LIKE '%2025-11-12%')
      ORDER BY processed_at DESC
      LIMIT 3
    `;

        const res = await client.query(query);

        if (res.rows.length > 0) {
            console.log(`Encontrados ${res.rows.length} registros:\n`);
            res.rows.forEach(row => {
                console.log(`Filename: ${row.filename}`);
                console.log(`ID: ${row.id}`);
                console.log(`Processed At: ${row.processed_at}`);

                let meta = row.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch (e) { }
                }

                const downloadDate = meta && meta.downloadDate ? meta.downloadDate : 'N/A';
                console.log(`Download Date: ${downloadDate}`);

                const now = new Date();
                const procDate = new Date(row.processed_at);
                const diffMins = (now - procDate) / 1000 / 60;
                console.log(`Última actualización: hace ${diffMins.toFixed(1)} minutos`);
                console.log('---\n');
            });
        } else {
            console.log('No se encontraron registros para esa fecha');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkSpecificDate();
