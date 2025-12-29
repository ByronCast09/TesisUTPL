const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function compareImages() {
    try {
        // Archivo remoto de las 13:45 (08:45 hora Ecuador)
        const remoteUrl = 'http://100.88.71.120:8080/2025-12-17/LGUAXX_2025121713450000dBuZ.png';

        // Archivo local desde el backend - ID 293757 (08:45:02 Ecuador)
        const localUrl = 'http://localhost:5000/api/radar/pngs/293757/image';

        console.log('⬇️  Descargando imagen remota...');
        const remoteResp = await axios({ url: remoteUrl, responseType: 'arraybuffer' });
        const remoteBuffer = Buffer.from(remoteResp.data);
        console.log(`✓ Remoto: ${remoteBuffer.length} bytes`);

        console.log('\n⬇️  Descargando desde backend local...');
        const localResp = await axios({ url: localUrl, responseType: 'arraybuffer' });
        const localBuffer = Buffer.from(localResp.data);
        console.log(`✓ Local: ${localBuffer.length} bytes`);

        // Guardar para inspección
        const testDir = path.join(__dirname, 'png_compare');
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        fs.writeFileSync(path.join(testDir, 'remote.png'), remoteBuffer);
        fs.writeFileSync(path.join(testDir, 'local.png'), localBuffer);

        console.log('\n📁 Archivos guardados en png_compare/');
        console.log('  - remote.png (desde PC remota)');
        console.log('  - local.png (desde PostgreSQL)');
        console.log('\n👉 Abre ambos archivos y compara los colores');

        // Comparación binaria
        if (remoteBuffer.equals(localBuffer)) {
            console.log('\n✅ ¡Las imágenes son IDÉNTICAS!');
            console.log('   No hay corrupción - el problema está en otro lugar');
        } else {
            console.log('\n❌ Las imágenes son DIFERENTES');
            console.log('   Confirmado: hay corrupción entre remoto y PostgreSQL');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

compareImages();
