#!/usr/bin/env node
/**
 * Script para sincronizar TODAS las fechas disponibles desde la PC remota
 * Compara fechas disponibles remotas vs PostgreSQL y sincroniza las faltantes
 */

require('dotenv').config();
const remoteRadarService = require('../services/remoteRadarService');
const radarMetadataRepository = require('../services/radarMetadataRepository');
const pngDownloadService = require('../services/pngDownloadService');

async function sincronizarTodasFechas(radarId = 'LGUAXX') {
  console.log(`\n🔍 Sincronizando TODAS las fechas para ${radarId}...\n`);

  try {
    // 1. Obtener fechas disponibles en PC remota
    console.log('📡 Obteniendo fechas disponibles en PC remota...');
    const remoteFiles = await remoteRadarService.listAllRemoteFiles(radarId);
    const remoteDates = remoteFiles
      .filter(entry => entry.png && entry.png.length > 0)
      .map(entry => entry.date)
      .sort();
    
    console.log(`   ✓ Fechas remotas encontradas: ${remoteDates.length}`);
    console.log(`   Primera fecha: ${remoteDates[0] || 'N/A'}`);
    console.log(`   Última fecha: ${remoteDates[remoteDates.length - 1] || 'N/A'}`);

    // 2. Obtener fechas disponibles en PostgreSQL
    console.log('\n💾 Obteniendo fechas disponibles en PostgreSQL...');
    const dbDates = await radarMetadataRepository.getAvailableDates(radarId, 'ppi_png');
    console.log(`   ✓ Fechas en PostgreSQL: ${dbDates.length}`);
    console.log(`   Primera fecha: ${dbDates[0] || 'N/A'}`);
    console.log(`   Última fecha: ${dbDates[dbDates.length - 1] || 'N/A'}`);

    // 3. Encontrar fechas faltantes (TODAS, no solo recientes)
    const dbDatesSet = new Set(dbDates);
    const fechasFaltantes = remoteDates.filter(date => !dbDatesSet.has(date));
    
    // También verificar fechas que están en BD pero sin datos de imagen
    console.log('\n🔍 Verificando fechas con PNGs sin datos de imagen...');
    const fechasSinImagen = [];
    for (const date of dbDates) {
      const pngs = await radarMetadataRepository.listProcessed({
        radarId,
        productType: 'ppi_png',
        from: new Date(`${date}T00:00:00Z`),
        to: new Date(`${date}T23:59:59Z`),
        limit: 1000,
      });
      const sinImagen = pngs.filter(png => !png.png_data).length;
      if (sinImagen > 0) {
        fechasSinImagen.push(date);
      }
    }
    
    console.log(`\n📊 Análisis:`);
    console.log(`   Fechas remotas: ${remoteDates.length}`);
    console.log(`   Primera fecha remota: ${remoteDates[0] || 'N/A'}`);
    console.log(`   Última fecha remota: ${remoteDates[remoteDates.length - 1] || 'N/A'}`);
    console.log(`   Fechas en BD: ${dbDates.length}`);
    console.log(`   Primera fecha en BD: ${dbDates[0] || 'N/A'}`);
    console.log(`   Última fecha en BD: ${dbDates[dbDates.length - 1] || 'N/A'}`);
    console.log(`   Fechas faltantes: ${fechasFaltantes.length}`);
    console.log(`   Fechas sin datos de imagen: ${fechasSinImagen.length}`);

    if (fechasFaltantes.length === 0 && fechasSinImagen.length === 0) {
      console.log('\n✅ Todas las fechas ya están sincronizadas con datos de imagen!');
      return;
    }

    // Combinar fechas faltantes y fechas sin imagen
    const todasFechasASincronizar = [...new Set([...fechasFaltantes, ...fechasSinImagen])].sort();
    
    console.log(`\n📥 Fechas a sincronizar (${todasFechasASincronizar.length}):`);
    todasFechasASincronizar.slice(0, 10).forEach(date => console.log(`   - ${date}`));
    if (todasFechasASincronizar.length > 10) {
      console.log(`   ... y ${todasFechasASincronizar.length - 10} más`);
    }
    console.log(`   Primera: ${todasFechasASincronizar[0] || 'N/A'}`);
    console.log(`   Última: ${todasFechasASincronizar[todasFechasASincronizar.length - 1] || 'N/A'}`);

    // 4. Sincronizar TODAS las fechas (antiguas y recientes)
    console.log(`\n🔄 Sincronizando ${todasFechasASincronizar.length} fechas (incluyendo antiguas y recientes)...\n`);
    
    const results = {
      sincronizadas: 0,
      errores: 0,
    };

    for (let i = 0; i < todasFechasASincronizar.length; i++) {
      const date = todasFechasASincronizar[i];
      try {
        console.log(`[${i + 1}/${todasFechasASincronizar.length}] Sincronizando ${date}...`);
        const result = await pngDownloadService.downloadPngsForDate(radarId, date);
        results.sincronizadas++;
        console.log(`   ✓ ${date}: ${result.downloaded} descargados, ${result.skipped} omitidos`);
        
        // Pausa entre fechas
        if (i < todasFechasASincronizar.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`   ✗ Error sincronizando ${date}:`, error.message);
        results.errores++;
      }
    }

    // 5. Resumen final
    console.log(`\n✅ Sincronización completada:`);
    console.log(`   Fechas sincronizadas: ${results.sincronizadas}`);
    console.log(`   Errores: ${results.errores}`);

    // 6. Verificar fechas finales
    console.log(`\n🔍 Verificando fechas finales en PostgreSQL...`);
    const finalDates = await radarMetadataRepository.getAvailableDates(radarId, 'ppi_png');
    console.log(`   ✓ Total fechas en PostgreSQL: ${finalDates.length}`);
    console.log(`   Primera fecha: ${finalDates[0] || 'N/A'}`);
    console.log(`   Última fecha: ${finalDates[finalDates.length - 1] || 'N/A'}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
const radarId = process.argv[2] || 'LGUAXX';
sincronizarTodasFechas(radarId.toUpperCase())
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

