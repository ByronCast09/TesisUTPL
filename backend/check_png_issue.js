const { Pool } = require('pg');
const axios = require('axios');
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

async function checkPngIssue() {
    try {
        console.log('🔍 Verificando problema de PNG con color magenta\n');

        // 1. Verificar frames disponibles
        const query = `
            SELECT id, filename, radar_id, source_timestamp, 
                   LENGTH(png_data) as data_size,
                   SUBSTRING(encode(png_data, 'hex'), 1, 16) as first_bytes
            FROM radar_products
            WHERE product_type = 'ppi_png'
              AND png_data IS NOT NULL
            ORDER BY source_timestamp DESC
            LIMIT 5
        `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.log('❌ No hay frames con datos de imagen en la base de datos');
            return;
        }

        console.log(`✅ Encontrados ${result.rows.length} frames con datos de imagen:\n`);

        result.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.filename}`);
            console.log(`   Radar: ${row.radar_id}`);
            console.log(`   Timestamp: ${row.source_timestamp}`);
            console.log(`   Tamaño: ${row.data_size} bytes`);
            console.log(`   Primeros bytes (hex): ${row.first_bytes}`);
            console.log('');
        });

        // 2. Analizarlos primeros bytes para verificar que sea PNG válido
        const frame = result.rows[0];

        // Los PNGs válidos empiezan con: 89 50 4E 47 0D 0A 1A 0A
        const expectedPngHeader = '89504e470d0a1a0a';

        if (frame.first_bytes.toLowerCase().startsWith(expectedPngHeader)) {
            console.log('✅ El frame tiene un header PNG válido');
        } else {
            console.log(`❌ Header PNG INVÁLIDO - Esperado: ${expectedPngHeader}, Encontrado: ${frame.first_bytes}`);
            console.log('   Esto indica que los datos están corruptos en la base de datos\n');
        }

        // 3. Descargar PNG desde la API local para comparar
        console.log('\n📥 Descargando PNG desde API local...');
        const localUrl = `http://localhost:5000/api/radar/pngs/${frame.id}/image`;

        try {
            const localResponse = await axios({
                method: 'GET',
                url: localUrl,
                responseType: 'arraybuffer',
                timeout: 10000,
            });

            const localBuffer = Buffer.from(localResponse.data);
            console.log(`✅ Descargado desde API: ${localBuffer.length} bytes`);

            // Verificar header del PNG descargado
            const localHeader = localBuffer.slice(0, 8).toString('hex');
            if (localHeader === expectedPngHeader) {
                console.log('✅ PNG desde API tiene header válido\n');
            } else {
                console.log(`❌ PNG desde API tiene header INVÁLIDO: ${localHeader}\n`);
            }

            // Guardar para inspección visual
            const testDir = path.join(__dirname, 'png_debug');
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir, { recursive: true });
            }

            const localPath = path.join(testDir, 'from_api.png');
            fs.writeFileSync(localPath, localBuffer);
            console.log(`💾 PNG guardado para inspección: ${localPath}`);

        } catch (err) {
            console.error(`❌ Error descargando desde API: ${err.message}`);
        }

        // 4. Si hay metadata con URL original, descargar desde allí
        const metaQuery = `SELECT metadata FROM radar_products WHERE id = $1`;
        const metaResult = await pool.query(metaQuery, [frame.id]);

        if (metaResult.rows[0]?.metadata) {
            const metadata = metaResult.rows[0].metadata;
            const originalUrl = metadata.originalUrl || metadata.url;

            if (originalUrl) {
                console.log(`\n🌐 URL original encontrada: ${originalUrl}`);
                console.log('📥 Descargando PNG desde URL original...');

                try {
                    const remoteResponse = await axios({
                        method: 'GET',
                        url: originalUrl,
                        responseType: 'arraybuffer',
                        timeout: 30000,
                    });

                    const remoteBuffer = Buffer.from(remoteResponse.data);
                    console.log(`✅ Descargado desde URL original: ${remoteBuffer.length} bytes`);

                    // Verificar header
                    const remoteHeader = remoteBuffer.slice(0, 8).toString('hex');
                    if (remoteHeader === expectedPngHeader) {
                        console.log('✅ PNG original tiene header válido');
                    } else {
                        console.log(`❌ PNG original tiene header INVÁLIDO: ${remoteHeader}`);
                    }

                    // Comparar con lo que está en la BD
                    const dbQuery = `SELECT png_data FROM radar_products WHERE id = $1`;
                    const dbResult = await pool.query(dbQuery, [frame.id]);
                    const dbBuffer = dbResult.rows[0].png_data;

                    console.log('\n🔬 Comparación:');
                    console.log(`   Tamaño original: ${remoteBuffer.length} bytes`);
                    console.log(`   Tamaño en BD:    ${dbBuffer.length} bytes`);

                    if (remoteBuffer.length === dbBuffer.length) {
                        const areEqual = remoteBuffer.equals(dbBuffer);
                        if (areEqual) {
                            console.log('   ✅ BUFFERS IDÉNTICOS - No hay corrupción');
                        } else {
                            console.log('   ❌ CONTENIDO DIFERENTE - HAY CORRUPCIÓN');

                            // Encontrar primera diferencia
                            for (let i = 0; i < Math.min(remoteBuffer.length, 100); i++) {
                                if (remoteBuffer[i] !== dbBuffer[i]) {
                                    console.log(`   Primera diferencia en byte ${i}:`);
                                    console.log(`     Original: 0x${remoteBuffer[i].toString(16).padStart(2, '0')}`);
                                    console.log(`     BD:       0x${dbBuffer[i].toString(16).padStart(2, '0')}`);
                                    break;
                                }
                            }
                        }
                    } else {
                        console.log('   ❌ TAMAÑOS DIFERENTES - HAY CORRUPCIÓN');
                    }

                    // Guardar original para comparación visual
                    const testDir = path.join(__dirname, 'png_debug');
                    const remotePath = path.join(testDir, 'from_remote.png');
                    const dbPath = path.join(testDir, 'from_database.png');

                    fs.writeFileSync(remotePath, remoteBuffer);
                    fs.writeFileSync(dbPath, dbBuffer);

                    console.log('\n💾 Archivos guardados para comparación visual:');
                    console.log(`   Original remoto:  ${remotePath}`);
                    console.log(`   Desde BD:         ${dbPath}`);
                    console.log('\n👉 Abre ambos archivos para comparar visualmente');

                } catch (err) {
                    console.error(`❌ Error descargando PNG original: ${err.message}`);
                }
            }
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

checkPngIssue();
