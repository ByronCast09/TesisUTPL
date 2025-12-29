const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_db',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
});

async function checkMetadata() {
    try {
        await client.connect();

        console.log('Verificando registros para el 15 de Noviembre de 2025...');

        // Consultar registros de LOXX para el 15 de Noviembre
        const query = `
      SELECT id, filename, processed_at, metadata
      FROM radar_products 
      WHERE radar_id = 'LOXX' 
      AND (filename LIKE '%20251115%' OR filename LIKE '%2025-11-15%')
      LIMIT 5
    `;

        const res = await client.query(query);

        if (res.rows.length > 0) {
            res.rows.forEach(row => {
                console.log(`ID: ${row.id}`);
                console.log(`Filename: ${row.filename}`);
                console.log(`Processed At: ${row.processed_at}`);

                let meta = row.metadata;
                if (typeof meta === 'string') {
                    try { meta = JSON.parse(meta); } catch (e) { }
                }

                const downloadDate = meta && meta.downloadDate ? meta.downloadDate : 'N/A';
                console.log(`Download Date: ${downloadDate}`);
                console.log('---');

                const procDate = new Date(row.processed_at);
                const now = new Date();
                const diffMins = (now - procDate) / 1000 / 60;
                console.log(`Updated ${diffMins.toFixed(1)} mins ago`);
            });
        } else {
            console.log('No records found for Nov 15, 2025');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkMetadata();
