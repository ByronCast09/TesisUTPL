#!/usr/bin/env node
/**
 * Script para corregir public_urls incorrectas en PostgreSQL
 * Actualiza las public_urls que apuntan a URLs remotas que no funcionan
 */

require('dotenv').config();
const db = require('../services/db');

async function corregirPublicUrls(radarId = 'LGUAXX') {
  console.log(`\n🔧 Corrigiendo public_urls para ${radarId}...\n`);

  if (!db.isConfigured()) {
    console.error('❌ PostgreSQL no está configurado');
    process.exit(1);
  }

  try {
    await db.initialize();

    // Buscar PNGs con public_url que apunta a URLs remotas
    const query = `
      SELECT id, filename, public_url, png_data
      FROM radar_products
      WHERE radar_id = $1 
        AND product_type = 'ppi_png'
        AND public_url IS NOT NULL
        AND (public_url LIKE 'http://100.%' OR public_url LIKE 'http://192.%' OR public_url LIKE 'http://10.%')
      ORDER BY source_timestamp DESC
    `;

    const result = await db.query(query, [radarId.toUpperCase()]);
    const pngs = result.rows || [];

    console.log(`📊 Encontrados ${pngs.length} PNGs con public_url remota`);

    if (pngs.length === 0) {
      console.log('✅ No hay PNGs con public_url remota que corregir');
      return;
    }

    // Construir la URL base local
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    
    let actualizados = 0;
    let sinDatos = 0;

    for (const png of pngs) {
      // Solo actualizar si tiene datos de imagen (png_data)
      if (!png.png_data) {
        console.log(`⚠️  ${png.filename}: Sin datos de imagen, estableciendo public_url a null`);
        await db.query(
          `UPDATE radar_products SET public_url = NULL WHERE id = $1`,
          [png.id]
        );
        sinDatos++;
        continue;
      }

      // Construir nueva URL local
      const nuevaUrl = `${baseUrl}/api/radar/pngs/${png.id}/image`;
      
      await db.query(
        `UPDATE radar_products SET public_url = $1 WHERE id = $2`,
        [nuevaUrl, png.id]
      );

      actualizados++;
      if (actualizados % 100 === 0) {
        console.log(`   Procesados: ${actualizados}/${pngs.length}`);
      }
    }

    console.log(`\n✅ Corrección completada:`);
    console.log(`   Actualizados: ${actualizados}`);
    console.log(`   Sin datos (public_url = null): ${sinDatos}`);
    console.log(`   Total procesados: ${pngs.length}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
const radarId = process.argv[2] || 'LGUAXX';
corregirPublicUrls(radarId.toUpperCase())
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

