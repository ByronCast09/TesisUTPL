#!/usr/bin/env node
/**
 * Script para descargar TODOS los PNGs desde la PC remota y guardarlos en PostgreSQL
 * con datos de imagen, para que el visor siempre use la URL local del endpoint
 */

require('dotenv').config();
const remoteRadarService = require('../services/remoteRadarService');
const radarMetadataRepository = require('../services/radarMetadataRepository');
const axios = require('axios');
const crypto = require('crypto');

async function descargarTodosPNGs(radarId = 'LGUAXX') {
  console.log(`\n📥 Descargando TODOS los PNGs para ${radarId} y guardándolos en PostgreSQL...\n`);

  try {
    // 1. Obtener todas las fechas disponibles en PC remota
    console.log('📡 Obteniendo fechas disponibles en PC remota...');
    const remoteFiles = await remoteRadarService.listAllRemoteFiles(radarId);
    const remoteDates = remoteFiles
      .filter(entry => entry.png && entry.png.length > 0)
      .map(entry => entry.date)
      .sort();
    
    console.log(`   ✓ Fechas remotas encontradas: ${remoteDates.length}`);
    console.log(`   Primera fecha: ${remoteDates[0] || 'N/A'}`);
    console.log(`   Última fecha: ${remoteDates[remoteDates.length - 1] || 'N/A'}`);

    // 2. Obtener fechas en PostgreSQL
    console.log('\n💾 Verificando fechas en PostgreSQL...');
    const dbDates = await radarMetadataRepository.getAvailableDates(radarId, 'ppi_png');
    const dbDatesSet = new Set(dbDates);
    
    console.log(`   ✓ Fechas en PostgreSQL: ${dbDates.length}`);

    // 3. Procesar todas las fechas remotas
    const results = {
      total: 0,
      descargados: 0,
      actualizados: 0,
      omitidos: 0,
      errores: 0,
    };

    console.log(`\n🔄 Procesando ${remoteDates.length} fechas...\n`);

    for (let i = 0; i < remoteDates.length; i++) {
      const date = remoteDates[i];
      const dateEntry = remoteFiles.find(entry => entry.date === date);
      
      if (!dateEntry || !dateEntry.png || dateEntry.png.length === 0) {
        continue;
      }

      console.log(`[${i + 1}/${remoteDates.length}] Procesando ${date} (${dateEntry.png.length} PNGs)...`);

      for (const pngFile of dateEntry.png) {
        results.total++;
        
        try {
          // Verificar si ya existe en PostgreSQL
          const existing = await radarMetadataRepository.listProcessed({
            radarId: radarId.toUpperCase(),
            productType: 'ppi_png',
            from: new Date(`${date}T00:00:00Z`),
            to: new Date(`${date}T23:59:59Z`),
            limit: 1000,
          });

          const existingEntry = existing.find(e => e.filename === pngFile.name);
          
          // Si existe y tiene datos de imagen, omitir
          if (existingEntry && existingEntry.png_data) {
            results.omitidos++;
            continue;
          }

          // Descargar PNG desde URL remota
          console.log(`   Descargando: ${pngFile.name}`);
          const response = await axios({
            method: 'GET',
            url: pngFile.url,
            responseType: 'arraybuffer',
            timeout: 30000,
          });

          const pngBuffer = Buffer.from(response.data);
          const checksum = crypto.createHash('md5').update(pngBuffer).digest('hex');

          // Extraer timestamp del filename
          let sourceTimestamp = null;
          try {
            const match = pngFile.name.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
            if (match) {
              const [, year, month, day, hour, minute, second] = match;
              sourceTimestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
            }
          } catch (err) {
            // Usar fecha del día si no se puede extraer
            sourceTimestamp = new Date(`${date}T12:00:00Z`);
          }

          // Guardar en PostgreSQL con datos de imagen
          const metadata = {
            source: 'remote_download',
            downloadDate: new Date().toISOString(),
            originalUrl: pngFile.url,
            date,
            filename: pngFile.name,
            checksum,
          };

          const result = await radarMetadataRepository.recordProcessedFile({
            radarId: radarId.toUpperCase(),
            productType: 'ppi_png',
            timestamp: sourceTimestamp,
            storagePath: pngFile.url,
            pngBuffer, // ¡Guardar datos de imagen!
            publicUrl: null, // Se usará la URL del endpoint local
            metadata,
            rawSource: { url: pngFile.url, date, filename: pngFile.name },
            status: 'ready',
            fileSize: pngBuffer.length,
            checksum,
            filename: pngFile.name,
          });

          if (result) {
            if (existingEntry) {
              results.actualizados++;
              console.log(`   ✓ Actualizado: ${pngFile.name} (ID: ${result.id})`);
            } else {
              results.descargados++;
              console.log(`   ✓ Descargado: ${pngFile.name} (ID: ${result.id})`);
            }
          }

          // Pausa pequeña
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`   ✗ Error: ${pngFile.name} - ${error.message}`);
          results.errores++;
        }
      }

      // Pausa entre fechas
      if (i < remoteDates.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 4. Resumen final
    console.log(`\n✅ Proceso completado:`);
    console.log(`   Total procesados: ${results.total}`);
    console.log(`   Descargados: ${results.descargados}`);
    console.log(`   Actualizados: ${results.actualizados}`);
    console.log(`   Omitidos: ${results.omitidos}`);
    console.log(`   Errores: ${results.errores}`);

    // 5. Verificar fechas finales
    console.log(`\n🔍 Verificando fechas finales en PostgreSQL...`);
    const finalDates = await radarMetadataRepository.getAvailableDates(radarId, 'ppi_png');
    console.log(`   ✓ Total fechas en PostgreSQL: ${finalDates.length}`);
    console.log(`   Primera fecha: ${finalDates[0] || 'N/A'}`);
    console.log(`   Última fecha: ${finalDates[finalDates.length - 1] || 'N/A'}`);

    // Verificar PNGs con datos de imagen
    const allPngs = await radarMetadataRepository.listProcessed({
      radarId: radarId.toUpperCase(),
      productType: 'ppi_png',
      limit: 10000,
    });
    const withImage = allPngs.filter(png => png.png_data).length;
    console.log(`   ✓ PNGs con datos de imagen: ${withImage}/${allPngs.length}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
const radarId = process.argv[2] || 'LGUAXX';
descargarTodosPNGs(radarId.toUpperCase())
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

