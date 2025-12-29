/**
 * Script para verificar que la automatización está configurada correctamente
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../services/db');
const schedule = require('node-schedule');

console.log('='.repeat(60));
console.log('VERIFICACIÓN DE CONFIGURACIÓN AUTOMÁTICA');
console.log('='.repeat(60));
console.log('');

// 1. Verificar PostgreSQL
console.log('1. Verificando conexión a PostgreSQL...');
if (db.isConfigured()) {
  console.log('   ✅ PostgreSQL configurado');
  db.initialize()
    .then(() => {
      console.log('   ✅ Conexión a PostgreSQL exitosa');
    })
    .catch((err) => {
      console.log('   ❌ Error de conexión:', err.message);
    });
} else {
  console.log('   ❌ PostgreSQL NO está configurado');
  console.log('   Configura las variables DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
}

console.log('');

// 2. Verificar STORE_PNG_IN_DB
console.log('2. Verificando almacenamiento de PNGs en BD...');
const storePng = String(process.env.STORE_PNG_IN_DB || '').trim().toLowerCase();
if (['1', 'true', 'yes', 'on'].includes(storePng)) {
  console.log('   ✅ STORE_PNG_IN_DB está activado');
} else {
  console.log('   ⚠️  STORE_PNG_IN_DB NO está activado');
  console.log('   Agrega STORE_PNG_IN_DB=true a tu archivo .env');
}

console.log('');

// 3. Verificar URLs remotas
console.log('3. Verificando URLs remotas de radar...');
const radars = ['LGUAXX', 'LOXX'];
let urlsOk = true;
radars.forEach(radar => {
  const url = process.env[`RADAR_${radar}_URL`];
  if (url) {
    console.log(`   ✅ ${radar}: ${url}`);
  } else {
    console.log(`   ❌ ${radar}: NO configurado`);
    urlsOk = false;
  }
});

if (!urlsOk) {
  console.log('   Configura RADAR_LGUAXX_URL y RADAR_LOXX_URL en tu .env');
}

console.log('');

// 4. Verificar configuración de cron
console.log('4. Verificando configuración de tarea programada...');
const pngCron = process.env.PNG_DOWNLOAD_CRON || '0 * * * *';
console.log(`   Cron configurado: ${pngCron}`);
console.log('   (Cada hora en el minuto 0)');

// Mostrar próxima ejecución
const job = schedule.scheduleJob(pngCron, () => {});
if (job) {
  const nextRun = job.nextInvocation();
  if (nextRun) {
    console.log(`   Próxima ejecución: ${nextRun.toISOString()}`);
  }
  job.cancel();
}

console.log('');

// 5. Resumen
console.log('='.repeat(60));
console.log('RESUMEN:');
console.log('='.repeat(60));
console.log('');
console.log('Para que la automatización funcione:');
console.log('1. ✅ El servidor debe estar corriendo (npm start en backend/)');
console.log('2. ✅ PostgreSQL debe estar configurado y accesible');
console.log('3. ✅ STORE_PNG_IN_DB=true debe estar en .env');
console.log('4. ✅ Las URLs remotas deben estar configuradas');
console.log('');
console.log('La descarga automática se ejecutará cada hora automáticamente.');
console.log('Puedes ver los logs en la consola del servidor.');
console.log('');

