const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_db',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432,
});

async function checkProgress() {
    try {
        await client.connect();

        // Buscar el registro más antiguo que haya sido actualizado en las últimas 2 horas
        const query = `
      SELECT source_timestamp, filename, processed_at
      FROM radar_products 
      WHERE radar_id = 'LOXX' 
      AND processed_at > NOW() - INTERVAL '2 hours'
      ORDER BY source_timestamp ASC
      LIMIT 1
    `;

        const res = await client.query(query);

        if (res.rows.length > 0) {
            const oldestFixed = new Date(res.rows[0].source_timestamp);
            console.log('--- Progreso de Resincronización ---');
            console.log(`Fecha más antigua ya corregida: ${oldestFixed.toISOString().split('T')[0]}`);
            console.log(`Hora exacta: ${oldestFixed.toLocaleTimeString()}`);
            console.log(`Archivo: ${res.rows[0].filename}`);
            console.log('');
            console.log('CONCLUSIÓN:Cualquier fecha DESPUÉS de esta ya debería verse correctamente.');
        } else {
            console.log('No se encontraron actualizaciones recientes. ¿El script está corriendo?');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkProgress();
