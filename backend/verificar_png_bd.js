const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'radar_metadata',
});

async function verificarPNG() {
    try {
        console.log('📊 Verificando PNG en PostgreSQL...\n');

        // Estadísticas generales
        const statsQuery = `
      SELECT 
        radar_id, 
        COUNT(*) as total, 
        MIN(source_timestamp) as primero, 
        MAX(source_timestamp) as ultimo,
        SUM(CASE WHEN png_data IS NOT NULL THEN 1 ELSE 0 END) as con_imagen
      FROM radar_products
      WHERE product_type = 'ppi_png'
      GROUP BY radar_id
      ORDER BY radar_id
    `;

        const statsResult = await pool.query(statsQuery);

        if (statsResult.rows.length === 0) {
            console.log('❌ No hay PNG en la base de datos');
            console.log('   Necesitas activar ENABLE_PNG_SYNC=true para sincronizar desde servidores remotos');
            return;
        }

        console.log('✅ PNG encontrados en PostgreSQL:\n');
        statsResult.rows.forEach(row => {
            console.log(`📡 ${row.radar_id}:`);
            console.log(`   Total de registros: ${row.total}`);
            console.log(`   Con datos de imagen: ${row.con_imagen}`);
            console.log(`   Primer frame: ${row.primero?.toISOString().split('T')[0] || 'N/A'}`);
            console.log(`   Último frame: ${row.ultimo?.toISOString().split('T')[0] || 'N/A'}`);
            console.log('');
        });

        // Frames de hoy
        const today = new Date().toISOString().split('T')[0];
        const todayQuery = `
      SELECT 
        radar_id,
        COUNT(*) as total_hoy
      FROM radar_products
      WHERE product_type = 'ppi_png'
        AND png_data IS NOT NULL
        AND source_timestamp >= $1::date
        AND source_timestamp < ($1::date + interval '1 day')
      GROUP BY radar_id
      ORDER BY radar_id
    `;

        const todayResult = await pool.query(todayQuery, [today]);

        console.log(`📅 Frames disponibles para HOY (${today}):\n`);
        if (todayResult.rows.length === 0) {
            console.log('   ⚠️  No hay frames de hoy');
            console.log('   El visor mostrará los frames más recientes disponibles');
        } else {
            todayResult.rows.forEach(row => {
                console.log(`   ${row.radar_id}: ${row.total_hoy} frames`);
            });
        }

        console.log('\n💡 Para ver estos frames en el visor:');
        console.log('   1. Abre: http://localhost:3000/visor-nuevo');
        console.log('   2. Los frames se cargarán automáticamente desde PostgreSQL');
        console.log('   3. No se necesita conexión a servidores remotos');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

verificarPNG();
