/**
 * Script para diagnosticar problemas del visor con PostgreSQL
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const radarMetadataRepository = require('../services/radarMetadataRepository');
const db = require('../services/db');

async function diagnosticar() {
  console.log('='.repeat(60));
  console.log('DIAGNÓSTICO: Visor y PostgreSQL');
  console.log('='.repeat(60));
  console.log('');

  // 1. Verificar conexión a PostgreSQL
  console.log('1. Verificando conexión a PostgreSQL...');
  if (!db.isConfigured()) {
    console.log('   ❌ PostgreSQL NO está configurado');
    console.log('   Configura DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME en .env');
    return;
  }

  try {
    await db.initialize();
    console.log('   ✅ Conexión a PostgreSQL exitosa');
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
    return;
  }

  console.log('');

  // 2. Verificar STORE_PNG_IN_DB
  console.log('2. Verificando STORE_PNG_IN_DB...');
  const storePng = String(process.env.STORE_PNG_IN_DB || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(storePng)) {
    console.log('   ✅ STORE_PNG_IN_DB está activado');
  } else {
    console.log('   ⚠️  STORE_PNG_IN_DB NO está activado');
    console.log('   Agrega STORE_PNG_IN_DB=true a tu archivo .env');
  }

  console.log('');

  // 3. Verificar datos en PostgreSQL
  console.log('3. Verificando datos en PostgreSQL...');
  const radars = ['LGUAXX', 'LOXX'];
  
  for (const radarId of radars) {
    console.log(`   Radar: ${radarId}`);
    
    try {
      // Obtener fechas disponibles
      const dates = await radarMetadataRepository.getAvailableDates(radarId, 'ppi_png');
      console.log(`      Fechas disponibles: ${dates.length}`);
      
      if (dates.length === 0) {
        console.log(`      ⚠️  No hay fechas disponibles para ${radarId}`);
        console.log(`      Esto significa que no hay PNGs en PostgreSQL para este radar.`);
        console.log(`      Solución: Ejecuta la sincronización para descargar PNGs.`);
      } else {
        console.log(`      Fechas: ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? '...' : ''}`);
        
        // Contar PNGs totales
        const allPngs = await radarMetadataRepository.listProcessed({
          radarId,
          productType: 'ppi_png',
          limit: 50000, // Aumentar para ver todos los PNGs
        });
        console.log(`      Total PNGs: ${allPngs.length}`);
        
        // Verificar si tienen datos de imagen
        const withImageData = allPngs.filter(png => png.png_data).length;
        console.log(`      PNGs con datos de imagen: ${withImageData}`);
        
        if (withImageData === 0) {
          console.log(`      ⚠️  Ningún PNG tiene datos de imagen almacenados`);
          console.log(`      Esto puede ser porque STORE_PNG_IN_DB no estaba activado cuando se sincronizaron.`);
        }
      }
    } catch (error) {
      console.log(`      ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }

  // 4. Probar endpoint
  console.log('4. Probando endpoint del visor...');
  console.log('   URL: http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index');
  console.log('   Puedes probarlo con:');
  console.log('   curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index');
  console.log('');

  // 5. Resumen
  console.log('='.repeat(60));
  console.log('RESUMEN:');
  console.log('='.repeat(60));
  console.log('');
  console.log('Si no hay fechas disponibles:');
  console.log('1. Verifica que ENABLE_PNG_SYNC=true esté en .env');
  console.log('2. Verifica que el servidor esté corriendo');
  console.log('3. Espera a que la sincronización automática descargue PNGs');
  console.log('4. O ejecuta manualmente:');
  console.log('   curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=7"');
  console.log('');
  console.log('Si hay fechas pero el visor muestra 404:');
  console.log('1. Verifica que el servidor esté corriendo en el puerto correcto');
  console.log('2. Verifica la consola del navegador para ver el error exacto');
  console.log('3. Verifica que VITE_API_URL esté configurado correctamente en el frontend');
  console.log('');
}

diagnosticar().catch(error => {
  console.error('Error en diagnóstico:', error);
  process.exit(1);
});


