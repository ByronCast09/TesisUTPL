// Script para forzar una descarga manual con logging detallado
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDownload() {
    // La URL que DEBERÍA estar usando png-sync
    const testUrl = 'http://100.88.71.120:8080/2025-12-17/LGUAXX_2025121713450000dBuZ.png';

    console.log('🌐 Descargando desde:', testUrl);
    console.log('📋 Headers que se enviarán:', {
        'User-Agent': axios.defaults.headers?.['User-Agent'] || 'axios',
        'Accept': '*/*',
    });

    try {
        const response = await axios({
            method: 'GET',
            url: testUrl,
            responseType: 'arraybuffer',
            timeout: 120000,
        });

        const buffer = Buffer.from(response.data);
        console.log(`\n✓ Descargado: ${buffer.length} bytes`);
        console.log(`📊 Headers de respuesta:`, response.headers);

        // Guardar
        const testDir = path.join(__dirname, 'png_test_download');
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        const testPath = path.join(testDir, 'downloaded_like_sync.png');
        fs.writeFileSync(testPath, buffer);

        console.log(`\n💾 Archivo guardado en: ${testPath}`);
        console.log(`👉 Ábrelo y verifica el color`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

testDownload();
