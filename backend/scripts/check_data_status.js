const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkData() {
    try {
        // Contar registros totales
        const totalResult = await pool.query('SELECT COUNT(*) FROM radar_metadata');
        console.log(`📊 Total de registros en radar_metadata: ${totalResult.rows[0].count}`);

        // Contar por radar
        const byRadar = await pool.query(`
      SELECT radar_id, COUNT(*) as count 
      FROM radar_metadata 
      GROUP BY radar_id
    `);
        console.log('\n📡 Por radar:');
        byRadar.rows.forEach(row => {
            console.log(`  ${row.radar_id}: ${row.count} registros`);
        });

        // Últimos 5 registros
        const latest = await pool.query(`
      SELECT radar_id, filename, source_timestamp 
      FROM radar_metadata 
      ORDER BY source_timestamp DESC 
      LIMIT 5
    `);
        console.log('\n🕐 Últimos 5 registros:');
        latest.rows.forEach(row => {
            console.log(`  ${row.radar_id} - ${row.filename} - ${row.source_timestamp}`);
        });

        // Fechas disponibles
        const dates = await pool.query(`
      SELECT DATE(source_timestamp) as date, COUNT(*) as count
      FROM radar_metadata
      GROUP BY DATE(source_timestamp)
      ORDER BY date DESC
      LIMIT 10
    `);
        console.log('\n📅 Fechas con datos:');
        dates.rows.forEach(row => {
            console.log(`  ${row.date}: ${row.count} registros`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkData();
