/**
 * Script para probar la descarga de PNGs
 * Uso: node scripts/probar_descarga_pngs.js [radarId] [opcion]
 * 
 * Opciones:
 *   - all: Descarga todos los PNGs nuevos
 *   - recent: Descarga PNGs de los últimos 7 días
 *   - date YYYY-MM-DD: Descarga PNGs de una fecha específica
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pngDownloadService = require('../services/pngDownloadService');

const radarId = process.argv[2] || 'LGUAXX';
const opcion = process.argv[3] || 'recent';
const fecha = process.argv[4];

async function main() {
  console.log('='.repeat(60));
  console.log('PRUEBA DE DESCARGA DE PNGs');
  console.log('='.repeat(60));
  console.log(`Radar: ${radarId}`);
  console.log(`Opción: ${opcion}`);
  console.log('');

  try {
    let resultados;

    switch (opcion) {
      case 'all':
        console.log('Descargando TODOS los PNGs nuevos...');
        resultados = await pngDownloadService.downloadAllNewPngs(radarId);
        break;

      case 'recent':
        const dias = fecha ? parseInt(fecha) : 7;
        console.log(`Descargando PNGs de los últimos ${dias} días...`);
        resultados = await pngDownloadService.downloadRecentPngs(radarId, dias);
        break;

      case 'date':
        if (!fecha) {
          console.error('ERROR: Debes proporcionar una fecha (YYYY-MM-DD)');
          console.log('Uso: node scripts/probar_descarga_pngs.js LGUAXX date 2025-01-24');
          process.exit(1);
        }
        console.log(`Descargando PNGs de la fecha ${fecha}...`);
        resultados = await pngDownloadService.downloadPngsForDate(radarId, fecha);
        break;

      default:
        console.error(`ERROR: Opción "${opcion}" no válida`);
        console.log('Opciones válidas: all, recent, date');
        process.exit(1);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTADOS:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(resultados, null, 2));
    console.log('');

    if (resultados.errors && resultados.errors.length > 0) {
      console.log('⚠️  Errores encontrados:');
      resultados.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${JSON.stringify(err)}`);
      });
    }

    console.log('');
    console.log('✅ Proceso completado');
  } catch (error) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

