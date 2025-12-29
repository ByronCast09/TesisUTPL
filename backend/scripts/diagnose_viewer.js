// Diagnóstico completo del endpoint viewer-index
const fetch = require('node-fetch');

async function diagnoseViewer() {
    try {
        console.log('=== DIAGNÓSTICO VIEWER-INDEX ===\n');

        // Test endpoint
        console.log('1. Probando endpoint...');
        const url = 'http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index';
        const response = await fetch(url);
        const data = await response.json();

        console.log('✅ Endpoint responde correctamente\n');
        console.log('2. Datos generales:');
        console.log(`   - success: ${data.success}`);
        console.log(`   - radar: ${data.radar}`);
        console.log(`   - fechas disponibles: ${data.dates?.length || 0}`);
        console.log(`   - source: ${data.source}\n`);

        if (data.dates && data.dates.length > 0) {
            const latestDate = data.dates[data.dates.length - 1];
            console.log(`3. Última fecha: ${latestDate}`);

            if (data.index && data.index.LGUAXX && data.index.LGUAXX[latestDate]) {
                const frames = data.index.LGUAXX[latestDate];
                console.log(`   - Total de frames: ${frames.length}`);

                if (frames.length > 0) {
                    const lastFrame = frames[frames.length - 1];
                    console.log('\n4. Última imagen del día:');
                    console.log(`   - filename: ${lastFrame.filename}`);
                    console.log(`   - url: ${lastFrame.url}`);
                    console.log(`   - timestamp: ${lastFrame.timestamp}`);
                    console.log(`   - bounds: ${JSON.stringify(lastFrame.bounds)}`);
                    console.log(`   - metadata: ${lastFrame.metadata ? 'SÍ' : 'NO'}\n`);

                    // Probar si la imagen es accesible
                    console.log('5. Probando acceso a imagen...');
                    const imageUrl = `http://localhost:5000${lastFrame.url}`;
                    console.log(`   URL completa: ${imageUrl}`);

                    try {
                        const imgResponse = await fetch(imageUrl);
                        if (imgResponse.ok) {
                            const contentType = imgResponse.headers.get('content-type');
                            const contentLength = imgResponse.headers.get('content-length');
                            console.log(`   ✅ Imagen accesible`);
                            console.log(`   - Content-Type: ${contentType}`);
                            console.log(`   - Content-Length: ${contentLength} bytes`);
                        } else {
                            console.log(`   ❌ Error ${imgResponse.status}: ${imgResponse.statusText}`);
                        }
                    } catch (imgError) {
                        console.log(`   ❌ Error al acceder a imagen: ${imgError.message}`);
                    }

                    // Mostrar primeras 3 imágenes
                    console.log('\n6. Primeras 3 imágenes:');
                    frames.slice(0, 3).forEach((frame, i) => {
                        console.log(`   ${i + 1}. ${frame.filename} - ${frame.timestamp}`);
                    });

                    // Mostrar últimas 3 imágenes
                    console.log('\n7. Últimas 3 imágenes:');
                    frames.slice(-3).forEach((frame, i) => {
                        console.log(`   ${frames.length - 2 + i}. ${frame.filename} - ${frame.timestamp}`);
                    });
                }
            } else {
                console.log('   ❌ No hay frames para esta fecha');
            }
        } else {
            console.log('❌ No hay fechas disponibles');
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
}

diagnoseViewer();
