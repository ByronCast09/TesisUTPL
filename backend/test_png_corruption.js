const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radar_metadata',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function testPngCorruption() {
    try {
        console.log('🔍 Test de corrupción de PNG\n');

        // 1. Buscar un frame reciente en la BD
        const query = `
      SELECT id, filename, source_timestamp, metadata
      FROM radar_products
      WHERE radar_id = 'LGUAXX'
      AND product_type = 'ppi_png'
      AND source_timestamp >= CURRENT_DATE
      ORDER BY source_timestamp DESC
      LIMIT 1
    `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log('❌ No se encontraron frames de hoy');
            return;
        }

        const frame = result.rows[0];
        console.log(`📦 Frame encontrado:`);
        console.log(`   ID: ${frame.id}`);
        console.log(`   Filename: ${frame.filename}`);
        console.log(`   Timestamp: ${frame.source_timestamp}`);

        // 2. Construir URL desde filename (formato: LGUAXX_YYYYMMDD_HHMMSS.png)
        const date = frame.source_timestamp.toISOString().split('T')[0];
        const baseUrl = 'http://100.88.71.120:8080';
        const originalUrl = `${baseUrl}/${date}/${frame.filename}`;

        console.log(`\n🌐 URL construida: ${originalUrl}`);

        // 3. Descargar desde URL remota
        console.log('\n⬇️  Descargando desde URL remota...');
        const response = await axios({
            method: 'GET',
            url: originalUrl,
            responseType: 'arraybuffer',
            timeout: 30000,
        });

        const remoteBuffer = Buffer.from(response.data);
        console.log(`   ✓ Tamaño: ${remoteBuffer.length} bytes`);

        // 4. Obtener desde PostgreSQL
        console.log('\n💾 Obteniendo desde PostgreSQL...');
        const dbQuery = 'SELECT png_data FROM radar_products WHERE id = $1';
        const dbResult = await pool.query(dbQuery, [frame.id]);

        if (!dbResult.rows[0] || !dbResult.rows[0].png_data) {
            console.log('❌ No hay png_data en la BD');
            return;
        }

        const dbBuffer = dbResult.rows[0].png_data;
        console.log(`   ✓ Tamaño: ${dbBuffer.length} bytes`);

        // 5. Comparar
        console.log('\n🔬 Comparando buffers...');
        console.log(`   Tamaño remoto: ${remoteBuffer.length}`);
        console.log(`   Tamaño BD:     ${dbBuffer.length}`);

        if (remoteBuffer.length !== dbBuffer.length) {
            console.log('   ❌ TAMAÑOS DIFERENTES - Los archivos NO son iguales');
        } else {
            const areEqual = remoteBuffer.equals(dbBuffer);
            if (areEqual) {
                console.log('   ✅ BUFFERS IDÉNTICOS - El archivo se guardó correctamente');
            } else {
                console.log('   ❌ CONTENIDO DIFERENTE - Hay corrupción a pesar del mismo tamaño');
            }
        }

        // 6. Guardar ambos para inspección manual
        const testDir = path.join(__dirname, 'png_test');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const remotePath = path.join(testDir, 'remote.png');
        const dbPath = path.join(testDir, 'database.png');

        fs.writeFileSync(remotePath, remoteBuffer);
        fs.writeFileSync(dbPath, dbBuffer);

        console.log('\n💾 Archivos guardados para inspección:');
        console.log(`   Remoto: ${remotePath}`);
        console.log(`   BD:     ${dbPath}`);
        console.log('\n   👉 Abre ambos archivos y compara visualmente');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

testPngCorruption();
