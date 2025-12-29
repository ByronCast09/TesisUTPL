require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function checkDataByMonth() {
    try {
        console.log('📊 Registros en PostgreSQL por Mes/Año:\n');

        const query = `
      SELECT 
        radar_id,
        DATE_PART('year', source_timestamp) as year,
        DATE_PART('month', source_timestamp) as month,
        COUNT(*) as count
      FROM radar_products
      WHERE product_type = 'ppi_png'
      GROUP BY radar_id, year, month
      ORDER BY year DESC, month DESC, radar_id
      LIMIT 20
    `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log('❌ No hay registros de tipo ppi_png en la base de datos');
            return;
        }

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        console.log('Radar     | Año  | Mes       | Cantidad');
        console.log('----------|------|-----------|----------');

        result.rows.forEach(row => {
            const monthName = monthNames[row.month - 1];
            console.log(`${row.radar_id.padEnd(9)} | ${row.year} | ${monthName.padEnd(9)} | ${row.count}`);
        });

        // Total general
        const totalQuery = `
      SELECT COUNT(*) as total, 
             MIN(source_timestamp) as oldest,
             MAX(source_timestamp) as newest
      FROM radar_products
      WHERE product_type = 'ppi_png'
    `;

        const totalResult = await pool.query(totalQuery);
        const { total, oldest, newest } = totalResult.rows[0];

        console.log('\n📅 Rango de fechas disponibles:');
        console.log(`   Más antiguo: ${oldest}`);
        console.log(`   Más reciente: ${newest}`);
        console.log(`   Total registros: ${total}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkDataByMonth();
