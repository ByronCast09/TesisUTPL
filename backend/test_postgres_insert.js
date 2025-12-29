const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_metadata',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function testInsert() {
    try {
        // Leer el PNG correcto (celeste)
        const correctPath = path.join(__dirname, 'png_test_download', 'downloaded_like_sync.png');
        const correctBuffer = fs.readFileSync(correctPath);

        console.log(`📄 PNG correcto: ${correctBuffer.length} bytes`);

        // Insertar en PostgreSQL con un ID temporal
        const testTimestamp = new Date('2025-12-17T13:45:00Z');
        const testFilename = 'TEST_CORRECT_INSERT.png';

        console.log('\n💾 Insertando en PostgreSQL...');

        const result = await pool.query(`
      INSERT INTO radar_products (
        radar_id, product_type, filename, storage_path,
        png_data, source_timestamp, processed_at, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING id, LENGTH(png_data) as size
    `, [
            'LGUAXX',
            'ppi_png',
            testFilename,
            'test_path',
            correctBuffer,
            testTimestamp,
            'ready'
        ]);

        const insertedId = result.rows[0].id;
        const insertedSize = result.rows[0].size;

        console.log(`✓ Insertado con ID: ${insertedId}`);
        console.log(`📊 Tamaño en BD: ${insertedSize} bytes`);

        // Leer de vuelta desde PostgreSQL
        console.log('\n📥 Leyendo desde PostgreSQL...');
        const readResult = await pool.query(
            'SELECT png_data FROM radar_products WHERE id = $1',
            [insertedId]
        );

        const readBuffer = readResult.rows[0].png_data;
        console.log(`✓ Leído: ${readBuffer.length} bytes`);

        // Guardar lo leído
        const readPath = path.join(__dirname, 'png_test_download', 'read_from_db.png');
        fs.writeFileSync(readPath, readBuffer);

        console.log(`\n💾 Archivo leído guardado en: ${readPath}`);

        // Comparar
        if (correctBuffer.equals(readBuffer)) {
            console.log('\n✅ ¡BUFFERS IDÉNTICOS!');
            console.log('   PostgreSQL NO corrompe el archivo');
        } else {
            console.log('\n❌ BUFFERS DIFERENTES');
            console.log(`   Original: ${correctBuffer.length} bytes`);
            console.log(`   Leído:    ${readBuffer.length} bytes`);
            console.log('   PostgreSQL SÍ corrompe el archivo');
        }

        console.log('\n👉 Abre read_from_db.png y verifica el color');

        // Limpiar
        await pool.query('DELETE FROM radar_products WHERE id = $1', [insertedId]);
        console.log(`\n🗑️  Registro de prueba eliminado (ID: ${insertedId})`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

testInsert();
