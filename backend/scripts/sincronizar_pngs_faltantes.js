/**
 * Script para sincronizar PNGs faltantes construyendo URLs directamente
 * Útil cuando el índice remoto no tiene todos los archivos
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const radarMetadataRepository = require('../services/radarMetadataRepository');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../services/db');

async function sincronizarPNGsFaltantes(radarId) {
  console.log('='.repeat(60));
  console.log(`SINCRONIZACIÓN DE PNGs FALTANTES`);
  console.log('='.repeat(60));
  console.log(`Radar: ${radarId}`);
  console.log('');

  // Verificar configuración
  const storePng = String(process.env.STORE_PNG_IN_DB || '').trim().toLowerCase();
  if (!['1', 'true', 'yes', 'on'].includes(storePng)) {
    console.log('❌ ERROR: STORE_PNG_IN_DB no está activado');
    console.log('Agrega STORE_PNG_IN_DB=true a tu archivo .env');
    return;
  }

  const baseUrl = process.env[`RADAR_${radarId}_URL`] || process.env.RADAR_LGUAXX_URL;
  if (!baseUrl) {
    console.log('❌ ERROR: URL remota no configurada');
    console.log(`Configura RADAR_${radarId}_URL en .env`);
    return;
  }

  console.log(`✅ STORE_PNG_IN_DB está activado`);
  console.log(`✅ URL remota: ${baseUrl}`);
  console.log('');

  // Obtener PNGs sin datos de imagen
  console.log('Buscando PNGs sin datos de imagen...');
  const allPngs = await radarMetadataRepository.listProcessed({
    radarId: radarId.toUpperCase(),
    productType: 'ppi_png',
    limit: 10000,
  });

  const pngsSinImagen = allPngs.filter(png => !png.png_data);
  console.log(`Encontrados ${pngsSinImagen.length} PNGs sin datos de imagen`);
  console.log('');

  if (pngsSinImagen.length === 0) {
    console.log('✅ Todos los PNGs ya tienen datos de imagen almacenados');
    return;
  }

  const results = {
    procesados: 0,
    descargados: 0,
    errores: 0,
    noEncontrados: 0,
  };

  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

  console.log('Iniciando descarga...');
  console.log('');

  // Procesar en lotes
  const batchSize = 5;
  for (let i = 0; i < pngsSinImagen.length; i += batchSize) {
    const batch = pngsSinImagen.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (png) => {
      try {
        results.procesados++;
        
        // Extraer fecha
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
          console.log(`⚠️  [${results.procesados}/${pngsSinImagen.length}] No se pudo determinar fecha para ${png.filename}`);
          results.noEncontrados++;
          return;
        }

        // Construir URL directamente
        const url = new URL(`${date}/${png.filename}`, base).href;

        // Intentar descargar
        console.log(`[${results.procesados}/${pngsSinImagen.length}] Intentando: ${png.filename} (${date})`);
        
        try {
          const response = await axios({
            method: 'GET',
            url,
            responseType: 'arraybuffer',
            timeout: 30000,
            validateStatus: (status) => status < 500, // No lanzar error para 404
          });

          if (response.status === 404) {
            console.log(`   ⚠️  No encontrado en remoto (404): ${png.filename}`);
            results.noEncontrados++;
            return;
          }

          if (response.status !== 200) {
            console.log(`   ⚠️  Error ${response.status}: ${png.filename}`);
            results.errores++;
            return;
          }

          const pngBuffer = Buffer.from(response.data);
          const checksum = crypto.createHash('md5').update(pngBuffer).digest('hex');

          // Actualizar en PostgreSQL
          const result = await radarMetadataRepository.recordProcessedFile({
            radarId: radarId.toUpperCase(),
            productType: 'ppi_png',
            timestamp: png.source_timestamp ? new Date(png.source_timestamp) : null,
            storagePath: png.storage_path || url,
            pngBuffer,
            publicUrl: png.public_url || null,
            metadata: png.metadata || {},
            rawSource: png.raw_source || { url, date, filename: png.filename },
            status: 'ready',
            fileSize: pngBuffer.length,
            checksum,
            filename: png.filename,
          });

          if (result) {
            console.log(`   ✓ Descargado y actualizado: ${png.filename}`);
            results.descargados++;
          }

        } catch (error) {
          if (error.response?.status === 404) {
            console.log(`   ⚠️  No encontrado (404): ${png.filename}`);
            results.noEncontrados++;
          } else {
            console.error(`   ✗ Error: ${png.filename} - ${error.message}`);
            results.errores++;
          }
        }

        // Pausa pequeña
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`   ✗ Error procesando ${png.filename}:`, error.message);
        results.errores++;
      }
    }));

    // Pausa entre lotes
    if (i + batchSize < pngsSinImagen.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`   Progreso: ${results.descargados} descargados, ${results.noEncontrados} no encontrados, ${results.errores} errores`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTADOS:');
  console.log('='.repeat(60));
  console.log(`Procesados: ${results.procesados}`);
  console.log(`✓ Descargados y actualizados: ${results.descargados}`);
  console.log(`⚠️  No encontrados: ${results.noEncontrados}`);
  console.log(`✗ Errores: ${results.errores}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Nota: Los "no encontrados" pueden ser PNGs que ya no existen en la PC remota');
  console.log('o que tienen nombres diferentes. Esto es normal.');
}

async function main() {
  const radarId = process.argv[2] || 'LGUAXX';

  if (!db.isConfigured()) {
    console.error('❌ PostgreSQL no está configurado');
    process.exit(1);
  }

  await db.initialize();
  await sincronizarPNGsFaltantes(radarId);
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});


