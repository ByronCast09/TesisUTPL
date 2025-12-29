#!/usr/bin/env node
/**
 * Script para probar la conexión al índice remoto
 */

const axios = require('axios');

const BASE_URL = 'http://100.100.81.47:8080';
const ENDPOINTS = [
  'index.json',
  'api/radar/index',
  'index'
];

async function probarEndpoint(endpoint) {
  const url = `${BASE_URL}/${endpoint}`;
  console.log(`\n🔍 Probando: ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 120000, // 2 minutos
      headers: {
        'Accept': 'application/json',
        'Connection': 'keep-alive'
      }
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Éxito! (${elapsed}s)`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type']}`);
    
    if (response.data) {
      const data = response.data;
      let dateCount = 0;
      let pngCount = 0;
      
      if (data.dates) {
        dateCount = Object.keys(data.dates).length;
        Object.values(data.dates).forEach(files => {
          if (Array.isArray(files)) {
            pngCount += files.filter(f => {
              const name = typeof f === 'string' ? f : (f.file || f.name || '');
              return name.match(/\.png$/i);
            }).length;
          }
        });
      } else if (typeof data === 'object') {
        dateCount = Object.keys(data).filter(k => /\d{4}-\d{2}-\d{2}/.test(k)).length;
      }
      
      console.log(`   Fechas encontradas: ${dateCount}`);
      console.log(`   PNGs encontrados: ${pngCount}`);
      
      // Mostrar estructura de una fecha de ejemplo
      if (data.dates) {
        const firstDate = Object.keys(data.dates)[0];
        const firstFiles = data.dates[firstDate];
        console.log(`   Ejemplo fecha ${firstDate}: ${Array.isArray(firstFiles) ? firstFiles.length : 'N/A'} archivos`);
      }
    }
    
    return { success: true, url, elapsed };
  } catch (error) {
    const errorMsg = error.code === 'ETIMEDOUT' 
      ? `Timeout (${error.config?.timeout || 'N/A'}ms)` 
      : error.message;
    console.log(`❌ Error: ${errorMsg}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
    }
    return { success: false, url, error: errorMsg };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 Prueba de Conexión al Índice Remoto');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await probarEndpoint(endpoint);
    results.push(result);
    
    // Pequeña pausa entre intentos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Resumen:');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ Endpoints que funcionan:');
    successful.forEach(r => {
      console.log(`   ${r.url} (${r.elapsed}s)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Endpoints que fallan:');
    failed.forEach(r => {
      console.log(`   ${r.url}: ${r.error}`);
    });
  }
  
  if (successful.length === 0) {
    console.log('\n⚠️  Ningún endpoint funciona. Verifica:');
    console.log('   1. Que el servidor remoto esté corriendo');
    console.log('   2. Que el firewall permita conexiones en puerto 8080');
    console.log('   3. Que la IP sea correcta (100.100.81.47)');
    process.exit(1);
  } else {
    console.log('\n✅ Al menos un endpoint funciona correctamente');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});


