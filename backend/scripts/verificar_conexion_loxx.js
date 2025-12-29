/**
 * Script para verificar la conexión con el servidor LOXX remoto
 * Ejecutar: node scripts/verificar_conexion_loxx.js
 */

const axios = require('axios');
require('dotenv').config();

const RADAR_LOXX_URL = process.env.RADAR_LOXX_URL || 'http://100.100.81.47:8080';

console.log('='.repeat(60));
console.log('Diagnóstico de Conexión LOXX');
console.log('='.repeat(60));
console.log('');
console.log(`URL configurada: ${RADAR_LOXX_URL}`);
console.log('');

// Endpoints a probar
const endpoints = [
  '/api/radar/index',
  '/index.json',
  '/index',
];

async function testConnection() {
  for (const endpoint of endpoints) {
    const url = `${RADAR_LOXX_URL}${endpoint}`;
    console.log(`Probando: ${url}`);
    
    try {
      const response = await axios.get(url, {
        timeout: 30000, // 30 segundos para servidores que pueden tardar
        validateStatus: () => true, // Aceptar cualquier código de estado
      });
      
      if (response.status === 200) {
        console.log(`  ✓ [OK] Status: ${response.status}`);
        if (response.data && typeof response.data === 'object') {
          console.log(`  ✓ [OK] Respuesta JSON válida`);
          if (response.data.dates) {
            const dateCount = Object.keys(response.data.dates).length;
            console.log(`  ✓ [OK] Encontradas ${dateCount} fechas`);
          }
        }
        console.log('');
        return true; // Éxito
      } else {
        console.log(`  ✗ [ERROR] Status: ${response.status}`);
        console.log('');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ✗ [ERROR] Conexión rechazada`);
        console.log(`     El servidor no está corriendo o no es accesible desde esta IP`);
      } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.log(`  ✗ [ERROR] Timeout`);
        console.log(`     El servidor no responde (posible firewall o red)`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`  ✗ [ERROR] Host no encontrado`);
        console.log(`     La IP o dominio no es válido`);
      } else {
        console.log(`  ✗ [ERROR] ${error.message}`);
      }
      console.log('');
    }
  }
  
  return false;
}

async function main() {
  const success = await testConnection();
  
  console.log('='.repeat(60));
  if (success) {
    console.log('✓ Conexión exitosa');
    console.log('');
    console.log('El servidor LOXX remoto es accesible.');
    console.log('La sincronización debería funcionar correctamente.');
  } else {
    console.log('✗ Conexión fallida');
    console.log('');
    console.log('Posibles soluciones:');
    console.log('');
    console.log('1. Verifica que el servidor esté corriendo en la PC remota:');
    console.log('   - Ejecuta: start_loxx_server.bat');
    console.log('   - Verifica que muestre: "Servidor LOXX iniciado en puerto 8080"');
    console.log('');
    console.log('2. Verifica la IP en backend/.env:');
    console.log(`   RADAR_LOXX_URL=${RADAR_LOXX_URL}`);
    console.log('   - Debe ser la IP de Tailscale (si usas Tailscale)');
    console.log('   - O la IP local de la red');
    console.log('');
    console.log('3. Verifica el firewall en la PC remota:');
    console.log('   - Abre el puerto 8080 en el firewall de Windows');
    console.log('   - O ejecuta: netsh advfirewall firewall add rule name="LOXX Server" dir=in action=allow protocol=TCP localport=8080');
    console.log('');
    console.log('4. Verifica conectividad de red:');
    console.log('   - Ping a la IP remota: ping [IP_PC_REMOTA]');
    console.log('   - Verifica que Tailscale esté conectado (si usas Tailscale)');
    console.log('');
    console.log('5. Prueba desde la PC remota:');
    console.log('   - Abre: http://localhost:8080/api/radar/index');
    console.log('   - Debe mostrar un JSON');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);

