const axios = require('axios');

const LOXX_URL = process.env.RADAR_LOXX_URL || 'http://100.100.81.47:8080/';

console.log('🔍 Diagnóstico de Conexión LOXX');
console.log('================================\n');
console.log(`URL configurada: ${LOXX_URL}`);
console.log(`Intentando conectar...\n`);

async function testConnection() {
    const endpoints = [
        `${LOXX_URL}`,
        `${LOXX_URL}index`,
        `${LOXX_URL}index.json`,
        `${LOXX_URL}api/radar/index`,
        `${LOXX_URL}health`,
        `${LOXX_URL}status`
    ];

    console.log('Probando endpoints:\n');

    for (const endpoint of endpoints) {
        try {
            console.log(`⏳ Probando: ${endpoint}`);
            const response = await axios.get(endpoint, {
                timeout: 5000,
                validateStatus: () => true // Aceptar cualquier código de respuesta
            });
            console.log(`   ✅ Respuesta HTTP ${response.status}: ${response.statusText}`);
            if (response.data) {
                console.log(`   📦 Datos recibidos: ${JSON.stringify(response.data).substring(0, 100)}...`);
            }
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.log(`   ❌ ECONNREFUSED - El servidor no está escuchando en ese puerto`);
            } else if (error.code === 'ETIMEDOUT') {
                console.log(`   ❌ ETIMEDOUT - El servidor no responde (timeout)`);
            } else if (error.code === 'EHOSTUNREACH') {
                console.log(`   ❌ EHOSTUNREACH - No se puede alcanzar el host`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        console.log('');
    }

    console.log('\n📋 Resumen del Diagnóstico:');
    console.log('================================');
    console.log('\n⚠️  Si todos los endpoints fallan con ECONNREFUSED:');
    console.log('   1. Verifica que la PC remota de LOXX tenga el servidor HTTP corriendo');
    console.log('   2. Confirma que el puerto 8080 esté abierto en el firewall');
    console.log('   3. Verifica la IP correcta de la PC remota de LOXX');
    console.log('\n💡 Comandos útiles en la PC remota de LOXX:');
    console.log('   - Ver servicios corriendo: npm start (debe estar corriendo)');
    console.log('   - Ver IP de la PC: ipconfig (Windows) o ifconfig (Linux)');
    console.log('   - Probar localmente: curl http://localhost:8080/index.json');
}

testConnection().catch(console.error);
