const { Pool } = require('pg');

async function testConnection() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'radar_metadata'
    };

    console.log('Probando conexión a PostgreSQL:');
    console.log('Host:', config.host);
    console.log('Port:', config.port);
    console.log('Database:', config.database);
    console.log('User:', config.user);

    const pool = new Pool(config);

    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM radar_products');
        console.log('\n✅ Conexión exitosa!');
        console.log('Total rows en radar_products:', result.rows[0].total);

        // Ver si hay datos
        const sample = await pool.query('SELECT radar_id, COUNT(*) as count FROM radar_products GROUP BY radar_id');
        console.log('\nDatos por radar:');
        sample.rows.forEach(row => {
            console.log(`  ${row.radar_id}: ${row.count} frames`);
        });

    } catch (error) {
        console.error('\n❌ Error de conexión:', error.message);
        console.error('Código:', error.code);
    } finally {
        await pool.end();
    }

    process.exit(0);
}

testConnection();
