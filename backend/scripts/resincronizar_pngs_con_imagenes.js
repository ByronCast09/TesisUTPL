/**
 * Script para re-sincronizar PNGs existentes y guardar los datos de imagen
 * Esto es necesario si STORE_PNG_IN_DB no estaba activado cuando se sincronizaron originalmente
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const radarMetadataRepository = require('../services/radarMetadataRepository');
const remoteRadarService = require('../services/remoteRadarService');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../services/db');

async function resincronizarPNGs(radarId, limit = null) {
  console.log('='.repeat(60));
  console.log(`RE-SINCRONIZACIÓN DE PNGs CON DATOS DE IMAGEN`);
  console.log('='.repeat(60));
  console.log(`Radar: ${radarId}`);
  console.log('');

  // Verificar configuración
  const storePng = String(process.env.STORE_PNG_IN_DB || '').trim().toLowerCase();
  if (!['1', 'true', 'yes', 'on'].includes(storePng)) {
    console.log('❌ ERROR: STORE_PNG_IN_DB no está activado');
    console.log('Agrega STORE_PNG_IN_DB=true a tu archivo .env y reinicia el servidor');
    return;
  }

  console.log('✅ STORE_PNG_IN_DB está activado');
  console.log('');

  // Obtener PNGs que NO tienen datos de imagen
  console.log('Buscando PNGs sin datos de imagen...');
  const allPngs = await radarMetadataRepository.listProcessed({
    radarId: radarId.toUpperCase(),
    productType: 'ppi_png',
    limit: limit || 10000,
  });

  const pngsSinImagen = allPngs.filter(png => !png.png_data);
  console.log(`Encontrados ${pngsSinImagen.length} PNGs sin datos de imagen`);
  console.log('');

  if (pngsSinImagen.length === 0) {
    console.log('✅ Todos los PNGs ya tienen datos de imagen almacenados');
    return;
  }

  // Obtener índice remoto para obtener URLs
  console.log('Obteniendo índice remoto para URLs...');
  let remoteIndex = {};
  try {
    const allFiles = await remoteRadarService.listAllRemoteFiles(radarId);
    allFiles.forEach(entry => {
      remoteIndex[entry.date] = entry.png || [];
    });
    console.log(`✅ Índice remoto obtenido: ${Object.keys(remoteIndex).length} fechas`);
  } catch (error) {
    console.error('❌ Error obteniendo índice remoto:', error.message);
    return;
  }

  console.log('');
  console.log('Iniciando re-sincronización...');
  console.log('');

  const results = {
    procesados: 0,
    descargados: 0,
    errores: 0,
    noEncontrados: 0,
  };

  // Procesar en lotes para no sobrecargar
  const batchSize = 10;
  for (let i = 0; i < pngsSinImagen.length; i += batchSize) {
    const batch = pngsSinImagen.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (png) => {
      try {
        results.procesados++;
        
        // Extraer fecha del timestamp o filename
        let date = null;
        if (png.source_timestamp) {
          const ts = new Date(png.source_timestamp);
          date = ts.toISOString().split('T')[0];
        } else if (png.filename) {
          const match = png.filename.match(/(\d{4})(\d{2})(\d{2})/);
          if (match) {
            date = `${match[1]}-${match[2]}-${match[3]}`;
          }
        }

        if (!date) {
          console.log(`⚠️  No se pudo determinar fecha para ${png.filename}, omitiendo...`);
          results.noEncontrados++;
          return;
        }

        // Buscar URL en índice remoto
        let remoteFile = null;
        const dateFiles = remoteIndex[date] || [];
        remoteFile = dateFiles.find(f => f.name === png.filename);

        // Si no se encuentra, construir URL directamente desde la PC remota
        if (!remoteFile || !remoteFile.url) {
          // Intentar construir URL directamente
          const baseUrl = process.env[`RADAR_${radarId}_URL`] || process.env.RADAR_LGUAXX_URL;
          if (baseUrl) {
            const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
            const constructedUrl = new URL(`${date}/${png.filename}`, base).href;
            remoteFile = { name: png.filename, url: constructedUrl };
            console.log(`   ℹ️  Construyendo URL directamente: ${constructedUrl}`);
          } else {
            console.log(`⚠️  No se encontró URL remota para ${png.filename} (${date}), omitiendo...`);
            results.noEncontrados++;
            return;
          }
        }

        // Descargar PNG
        console.log(`[${results.procesados}/${pngsSinImagen.length}] Descargando: ${png.filename}`);
        const response = await axios({
          method: 'GET',
          url: remoteFile.url,
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const pngBuffer = Buffer.from(response.data);
        const checksum = crypto.createHash('md5').update(pngBuffer).digest('hex');

        // Actualizar en PostgreSQL con los datos de imagen
        const result = await radarMetadataRepository.recordProcessedFile({
          radarId: radarId.toUpperCase(),
          productType: 'ppi_png',
          timestamp: png.source_timestamp ? new Date(png.source_timestamp) : null,
          storagePath: png.storage_path || remoteFile.url,
          pngBuffer, // ¡Ahora sí guardamos el buffer!
          publicUrl: png.public_url || null,
          metadata: png.metadata || {},
          rawSource: png.raw_source || { url: remoteFile.url, date, filename: png.filename },
          status: 'ready',
          fileSize: pngBuffer.length,
          checksum,
          filename: png.filename,
        });

        if (result) {
          console.log(`   ✓ Actualizado: ${png.filename} (ID: ${result.id})`);
          results.descargados++;
        }

        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`   ✗ Error procesando ${png.filename}:`, error.message);
        results.errores++;
      }
    }));

    // Pausa entre lotes
    if (i + batchSize < pngsSinImagen.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTADOS:');
  console.log('='.repeat(60));
  console.log(`Procesados: ${results.procesados}`);
  console.log(`Descargados y actualizados: ${results.descargados}`);
  console.log(`Errores: ${results.errores}`);
  console.log(`No encontrados: ${results.noEncontrados}`);
  console.log('='.repeat(60));
}

async function main() {
  const radarId = process.argv[2] || 'LGUAXX';
  const limit = process.argv[3] ? parseInt(process.argv[3]) : null;

  if (!db.isConfigured()) {
    console.error('❌ PostgreSQL no está configurado');
    process.exit(1);
  }

  await db.initialize();
  await resincronizarPNGs(radarId, limit);
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

