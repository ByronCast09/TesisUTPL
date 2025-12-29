const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const client new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_db',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
});

async function verifyMetadata() {
    try {
        await client.connect();

        console.log('Verificando metadata de LOXX...\n');

        // Contar archivos con metadata de precipitación
        const countRes = await client.query(`
      SELECT COUNT(*) as total
      FROM radar_products 
      WHERE radar_id = 'LOXX' 
      AND metadata ? 'precipitation'
    `);

        console.log(`Total de archivos con metadata: ${countRes.rows[0].total}\n`);

        // Mostrar ejemplos
        const sampleRes = await client.query(`
      SELECT 
        filename,
        source_timestamp,
        metadata->'precipitation' as precipitation,
        metadata->'elevations' as elevations,
        metadata->'maxDbz' as max_dbz
      FROM radar_products 
      WHERE radar_id = 'LOXX' 
      AND metadata ? 'precipitation'
      ORDER BY source_timestamp DESC
      LIMIT 5
    `);

        console.log('Últimos 5 archivos con metadata:\n');
        sampleRes.rows.forEach((row, i) => {
            console.log(`${i + 1}. ${row.filename}`);
            console.log(`   Timestamp: ${row.source_timestamp}`);
            console.log(`   Precipitación: ${JSON.stringify(row.precipitation, null, 2)}`);
            console.log(`   Max dBZ: ${row.max_dbz}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

verifyMetadata();
