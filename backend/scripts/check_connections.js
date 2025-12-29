const axios = require('axios');

const radars = [
    { id: 'LGUAXX', url: 'http://100.88.71.120:8080/' },
    { id: 'LOXX', url: 'http://100.100.81.47:8080/' }
];

async function checkConnection(radar) {
    console.log(`\nProbando conexión con ${radar.id} (${radar.url})...`);
    try {
        const start = Date.now();
        const response = await axios.get(radar.url + 'index.json', { timeout: 5000 });
        const elapsed = Date.now() - start;
        console.log(`✅ [${radar.id}] Éxito! Respuesta en ${elapsed}ms`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Datos: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
        console.log(`❌ [${radar.id}] Falló: ${error.message}`);
        if (error.code) console.log(`   Código: ${error.code}`);
        console.log('   Sugerencia: Verificar si la PC remota está encendida, Tailscale conectado, y el servidor corriendo.');
    }
}

async function run() {
    console.log('=== TEST DE CONECTIVIDAD RADARES ===');
    for (const radar of radars) {
        await checkConnection(radar);
    }
    console.log('\n=== FIN DEL TEST ===');
}

run();
