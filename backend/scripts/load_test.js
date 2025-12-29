const axios = require('axios');

/**
 * Prueba de carga para simular múltiples usuarios
 */
async function loadTest() {
    const BASE_URL = 'http://localhost:5000';
    const CONCURRENT_USERS = 20; // Simular 20 usuarios concurrentes
    const REQUESTS_PER_USER = 5;

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  PRUEBA DE CARGA - MÚLTIPLES USUARIOS SIMULTÁNEOS         ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`Simulando ${CONCURRENT_USERS} usuarios concurrentes`);
    console.log(`Cada usuario hará ${REQUESTS_PER_USER} peticiones\n`);

    const endpoints = [
        { name: 'Health Check', url: '/api/health', method: 'GET' },
        { name: 'Analytics Metrics', url: '/api/analytics/metrics?period=today', method: 'GET' },
        { name: 'Analytics Temporal', url: '/api/analytics/temporal?period=today', method: 'GET' },
        { name: 'PNG Index LOXX', url: '/api/radar/LOXX/pngs/viewer-frames', method: 'GET' },
        { name: 'PNG Index LGUAXX', url: '/api/radar/LGUAXX/pngs/viewer-frames', method: 'GET' },
    ];

    const results = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTime: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        byEndpoint: {}
    };

    // Inicializar stats por endpoint
    endpoints.forEach(ep => {
        results.byEndpoint[ep.name] = {
            requests: 0,
            success: 0,
            failed: 0,
            totalTime: 0,
            avgTime: 0,
            errors: []
        };
    });

    const startTime = Date.now();

    // Simular usuarios concurrentes
    const userPromises = [];

    for (let user = 1; user <= CONCURRENT_USERS; user++) {
        const userPromise = (async () => {
            for (let req = 0; req < REQUESTS_PER_USER; req++) {
                const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

                try {
                    const reqStart = Date.now();
                    const response = await axios({
                        method: endpoint.method,
                        url: BASE_URL + endpoint.url,
                        timeout: 10000,
                        validateStatus: () => true // No throw on any status
                    });
                    const reqTime = Date.now() - reqStart;

                    results.totalRequests++;
                    results.byEndpoint[endpoint.name].requests++;
                    results.totalTime += reqTime;

                    if (reqTime < results.minResponseTime) results.minResponseTime = reqTime;
                    if (reqTime > results.maxResponseTime) results.maxResponseTime = reqTime;

                    if (response.status >= 200 && response.status < 300) {
                        results.successfulRequests++;
                        results.byEndpoint[endpoint.name].success++;
                        results.byEndpoint[endpoint.name].totalTime += reqTime;
                    } else {
                        results.failedRequests++;
                        results.byEndpoint[endpoint.name].failed++;
                        results.byEndpoint[endpoint.name].errors.push({
                            status: response.status,
                            message: response.statusText || 'Unknown error'
                        });
                    }

                    // Log progress cada 10 requests
                    if (results.totalRequests % 10 === 0) {
                        process.stdout.write(`\r✓ Completadas: ${results.totalRequests}/${CONCURRENT_USERS * REQUESTS_PER_USER} requests`);
                    }

                } catch (error) {
                    results.totalRequests++;
                    results.failedRequests++;
                    results.byEndpoint[endpoint.name].requests++;
                    results.byEndpoint[endpoint.name].failed++;
                    results.byEndpoint[endpoint.name].errors.push({
                        message: error.message
                    });
                }

                // Pequeña pausa entre requests del mismo usuario (50-200ms)
                await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
            }
        })();

        userPromises.push(userPromise);

        // Escalonar el inicio de usuarios (10ms entre cada uno)
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Esperar a que todos los usuarios terminen
    await Promise.all(userPromises);

    const totalTestTime = (Date.now() - startTime) / 1000;

    // Calcular promedios
    results.avgResponseTime = results.totalTime / results.totalRequests;

    // Calcular promedios por endpoint
    Object.keys(results.byEndpoint).forEach(epName => {
        const ep = results.byEndpoint[epName];
        if (ep.success > 0) {
            ep.avgTime = ep.totalTime / ep.success;
        }
    });

    // Mostrar resultados
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                   RESULTADOS DE LA PRUEBA');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`⏱️  Tiempo total: ${totalTestTime.toFixed(2)}s`);
    console.log(`✓ Peticiones exitosas: ${results.successfulRequests}/${results.totalRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)`);
    console.log(`❌ Peticiones fallidas: ${results.failedRequests}`);
    console.log(`📊 Throughput: ${(results.totalRequests / totalTestTime).toFixed(2)} req/s`);

    console.log(`\n⏱️  Tiempos de respuesta:`);
    console.log(`  - Promedio: ${results.avgResponseTime.toFixed(0)}ms`);
    console.log(`  - Mínimo: ${results.minResponseTime}ms`);
    console.log(`  - Máximo: ${results.maxResponseTime}ms`);

    console.log(`\n📋 Resultados por endpoint:\n`);

    Object.keys(results.byEndpoint).forEach(epName => {
        const ep = results.byEndpoint[epName];
        const successRate = ep.requests > 0 ? ((ep.success / ep.requests) * 100).toFixed(1) : 0;

        console.log(`${epName}:`);
        console.log(`  ✓ ${ep.success}/${ep.requests} exitosas (${successRate}%)`);
        if (ep.success > 0) {
            console.log(`  ⏱️  Tiempo promedio: ${ep.avgTime.toFixed(0)}ms`);
        }
        if (ep.errors.length > 0) {
            console.log(`  ❌ Errores: ${ep.errors.length}`);
            const uniqueErrors = [...new Set(ep.errors.map(e => e.message || `Status ${e.status}`))];
            uniqueErrors.slice(0, 3).forEach(err => console.log(`     - ${err}`));
        }
        console.log('');
    });

    // Evaluación
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                        EVALUACIÓN');
    console.log('═══════════════════════════════════════════════════════════\n');

    const successRate = (results.successfulRequests / results.totalRequests) * 100;

    if (successRate >= 95 && results.avgResponseTime < 500) {
        console.log('✅ EXCELENTE: El sistema maneja bien múltiples usuarios');
        console.log('   - Alta tasa de éxito (≥95%)');
        console.log('   - Tiempos de respuesta buenos (<500ms)');
    } else if (successRate >= 90 && results.avgResponseTime < 1000) {
        console.log('✓ BUENO: El sistema funciona correctamente');
        console.log('  - Tasa de éxito aceptable (≥90%)');
        console.log('  - Tiempos de respuesta aceptables (<1s)');
    } else if (successRate >= 80) {
        console.log('⚠️  ACEPTABLE: Hay margen de mejora');
        console.log('   - Considera optimizaciones adicionales');
    } else {
        console.log('❌ CRÍTICO: El sistema tiene problemas');
        console.log('   - Tasa de éxito baja (<80%)');
        console.log('   - Revisar logs y configuración');
    }

    return results;
}

// Ejecutar
if (require.main === module) {
    loadTest()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error en prueba de carga:', error.message);
            process.exit(1);
        });
}

module.exports = { loadTest };
