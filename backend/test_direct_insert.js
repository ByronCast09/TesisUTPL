// Test directo de inserción a PostgreSQL
require('dotenv').config();
const db = require('./services/db');

async function testDirectInsert() {
    console.log('🔍 TEST DIRECTO DE POSTGRESQL\n');

    // 1. Verificar conexión
    console.log('1. Verificando conexión...');
    const isConfigured = db.isConfigured();
    console.log('   DB configurada:', isConfigured);

    if (!isConfigured) {
        console.error('   ❌ DB no configurada');
        process.exit(1);
    }

    // 2. Test query simple
    console.log('\n2. Test query SELECT...');
    try {
        const result = await db.query('SELECT NOW() as current_time');
        console.log('   ✅ Query exitoso:', result.rows[0]);
    } catch (error) {
        console.error('   ❌ Error en query:', error.message);
        process.exit(1);
    }

    // 3. Contar frames existentes
    console.log('\n3. Contando frames en radar_products...');
    try {
        const count = await db.query('SELECT COUNT(*) as total FROM radar_products');
        console.log('   Total frames:', count.rows[0].total);
    } catch (error) {
        console.error('   ❌ Error contando:', error.message);
    }

    // 4. Test INSERT directo
    console.log('\n4. Probando INSERT directo...');
    try {
        const testData = {
            radar_id: 'LOXX',
            product_type: 'ppi_png',
            filename: 'TEST_INSERT.png',
            storage_path: 'http://test.com/test.png',
            source_timestamp: new Date(),
            status: 'ready'
        };

        const insertResult = await db.query(
            `INSERT INTO radar_products 
            (radar_id, product_type, filename, storage_path, source_timestamp, status, processed_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING *`,
            [
                testData.radar_id,
                testData.product_type,
                testData.filename,
                testData.storage_path,
                testData.source_timestamp,
                testData.status
            ]
        );

        if (insertResult.rows.length > 0) {
            console.log('   ✅ INSERT exitoso, ID:', insertResult.rows[0].id);
            console.log('   Datos insertados:', insertResult.rows[0]);
        } else {
            console.log('   ⚠️ INSERT no devolvió rows');
        }
    } catch (error) {
        console.error('   ❌ Error en INSERT:', error.message);
        console.error('   Stack:', error.stack);
    }

    // 5. Verificar inserción
    console.log('\n5. Verificando datos después del INSERT...');
    try {
        const finalCount = await db.query('SELECT COUNT(*) as total FROM radar_products');
        console.log('   Total frames ahora:', finalCount.rows[0].total);

        const testFrames = await db.query(
            'SELECT * FROM radar_products WHERE filename = $1',
            ['TEST_INSERT.png']
        );
        console.log('   Frames de prueba encontrados:', testFrames.rows.length);
    } catch (error) {
        console.error('   ❌ Error verificando:', error.message);
    }

    console.log('\n✅ Test completado');
    process.exit(0);
}

testDirectInsert().catch(err => {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
});
