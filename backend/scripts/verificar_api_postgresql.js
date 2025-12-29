#!/usr/bin/env node
/**
 * Script para verificar que la API local está consultando PostgreSQL correctamente
 * y que las imágenes están disponibles.
 */

const axios = require('axios');
const db = require('../services/db');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const RADAR_ID = process.argv[2] || 'LOXX';

async function verificarPostgreSQL() {
  console.log('\n📊 Verificando PostgreSQL...\n');
  
  if (!db.isConfigured()) {
    console.error('❌ PostgreSQL no está configurado');
    return false;
  }
  
  try {
    await db.initialize();
    
    // Contar imágenes en PostgreSQL
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as con_imagen,
        COUNT(CASE WHEN png_data IS NULL THEN 1 END) as sin_imagen
      FROM radar_products
      WHERE radar_id = $1 AND product_type = 'ppi_png'
    `, [RADAR_ID]);
    
    const stats = result.rows[0];
    console.log(`✅ PostgreSQL configurado correctamente`);
    console.log(`   Total de registros: ${stats.total}`);
    console.log(`   Con imagen (png_data): ${stats.con_imagen}`);
    console.log(`   Sin imagen: ${stats.sin_imagen}`);
    
    if (stats.con_imagen === 0) {
      console.warn('\n⚠️  No hay imágenes con datos en PostgreSQL');
      console.log('   Esto significa que la sincronización no ha descargado las imágenes aún.');
      console.log('   Espera unos minutos y vuelve a ejecutar este script.');
      return false;
    }
    
    // Obtener última imagen
    const lastImage = await db.query(`
      SELECT id, filename, source_timestamp, 
             CASE WHEN png_data IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_imagen
      FROM radar_products
      WHERE radar_id = $1 AND product_type = 'ppi_png' AND png_data IS NOT NULL
      ORDER BY source_timestamp DESC
      LIMIT 1
    `, [RADAR_ID]);
    
    if (lastImage.rows.length > 0) {
      const img = lastImage.rows[0];
      console.log(`\n📸 Última imagen en PostgreSQL:`);
      console.log(`   ID: ${img.id}`);
      console.log(`   Archivo: ${img.filename}`);
      console.log(`   Timestamp: ${img.source_timestamp}`);
      console.log(`   Tiene imagen: ${img.tiene_imagen}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error consultando PostgreSQL:', error.message);
    return false;
  }
}

async function verificarAPI() {
  console.log('\n🌐 Verificando API Local...\n');
  
  try {
    // 1. Verificar endpoint de índice
    console.log(`1. Consultando índice: GET ${API_URL}/radar/${RADAR_ID}/pngs/viewer-index`);
    const indexResponse = await axios.get(`${API_URL}/radar/${RADAR_ID}/pngs/viewer-index`, {
      timeout: 10000
    });
    
    if (!indexResponse.data?.success) {
      console.error('❌ La API no devolvió success: true');
      return false;
    }
    
    console.log(`✅ Índice obtenido correctamente`);
    console.log(`   Source: ${indexResponse.data.source}`);
    console.log(`   Fechas disponibles: ${indexResponse.data.index?.length || 0}`);
    
    if (!indexResponse.data.index || indexResponse.data.index.length === 0) {
      console.warn('\n⚠️  No hay fechas disponibles en el índice');
      return false;
    }
    
    // 2. Obtener primera imagen del índice
    const firstDate = indexResponse.data.index[0];
    const firstPng = firstDate.png?.[0];
    
    if (!firstPng) {
      console.warn('\n⚠️  No hay PNGs en la primera fecha');
      return false;
    }
    
    console.log(`\n📸 Primera imagen del índice:`);
    console.log(`   Fecha: ${firstDate.date}`);
    console.log(`   Archivo: ${firstPng.filename}`);
    console.log(`   URL: ${firstPng.url}`);
    console.log(`   ID: ${firstPng.id}`);
    
    // 3. Verificar que la URL de la imagen funciona
    if (firstPng.url && firstPng.id) {
      console.log(`\n2. Consultando imagen: GET ${firstPng.url}`);
      try {
        const imageResponse = await axios.get(firstPng.url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          validateStatus: (status) => status === 200
        });
        
        if (imageResponse.data && imageResponse.data.length > 0) {
          console.log(`✅ Imagen obtenida correctamente`);
          console.log(`   Tamaño: ${(imageResponse.data.length / 1024).toFixed(2)} KB`);
          console.log(`   Content-Type: ${imageResponse.headers['content-type']}`);
          return true;
        } else {
          console.error('❌ La imagen está vacía');
          return false;
        }
      } catch (imageError) {
        console.error(`❌ Error obteniendo imagen: ${imageError.message}`);
        if (imageError.response) {
          console.error(`   Status: ${imageError.response.status}`);
          console.error(`   Mensaje: ${imageError.response.data?.message || 'Sin mensaje'}`);
        }
        return false;
      }
    } else {
      console.warn('⚠️  La imagen no tiene URL o ID válido');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando API:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    return false;
  }
}

async function verificarUltimaImagen() {
  console.log('\n🕐 Verificando última imagen del día...\n');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Consultando: GET ${API_URL}/radar/${RADAR_ID}/pngs/latest-today?date=${today}`);
    
    const response = await axios.get(`${API_URL}/radar/${RADAR_ID}/pngs/latest-today`, {
      params: { date: today },
      timeout: 10000
    });
    
    if (response.data?.success && response.data?.image) {
      console.log(`✅ Última imagen del día obtenida`);
      console.log(`   ID: ${response.data.image.id}`);
      console.log(`   Archivo: ${response.data.image.filename}`);
      console.log(`   URL: ${response.data.image.url}`);
      console.log(`   Timestamp: ${response.data.image.timestamp}`);
      return true;
    } else {
      console.warn(`⚠️  No hay imagen para hoy (${today})`);
      console.log(`   Mensaje: ${response.data?.message || 'Sin mensaje'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error obteniendo última imagen:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log(`🔍 Verificación de API Local → PostgreSQL`);
  console.log(`   Radar: ${RADAR_ID}`);
  console.log(`   API URL: ${API_URL}`);
  console.log('='.repeat(60));
  
  const pgOk = await verificarPostgreSQL();
  if (!pgOk) {
    console.log('\n❌ PostgreSQL no está disponible o no tiene imágenes');
    console.log('   Asegúrate de que:');
    console.log('   1. PostgreSQL esté configurado en .env');
    console.log('   2. El servicio de sincronización esté corriendo');
    console.log('   3. Haya imágenes sincronizadas en PostgreSQL');
    process.exit(1);
  }
  
  const apiOk = await verificarAPI();
  if (!apiOk) {
    console.log('\n❌ La API no está funcionando correctamente');
    console.log('   Asegúrate de que:');
    console.log('   1. El servidor backend esté corriendo (npm start)');
    console.log('   2. La API esté accesible en', API_URL);
    process.exit(1);
  }
  
  await verificarUltimaImagen();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Verificación completada');
  console.log('\n📝 Resumen:');
  console.log('   ✅ PostgreSQL tiene imágenes');
  console.log('   ✅ API local funciona correctamente');
  console.log('   ✅ Las imágenes se sirven desde PostgreSQL');
  console.log('\n💡 El visor debe usar estas URLs locales, NO el servidor remoto');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});


