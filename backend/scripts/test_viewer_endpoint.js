// Test del endpoint de viewer PNG index
const fetch = require('node-fetch');

async function testViewerEndpoint() {
    try {
        console.log('Probando endpoint: http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index');

        const response = await fetch('http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index');
        const data = await response.json();

        console.log('\nRespuesta del API:');
        console.log('- success:', data.success);
        console.log('- dates disponibles:', data.dates?.length || 0);
        console.log('- fechas:', data.dates);

        if (data.index) {
            console.log('\nÍndice por radar:');
            Object.keys(data.index).forEach(radarId => {
                const radarData = data.index[radarId];
                const dates = Object.keys(radarData);
                console.log(`  ${radarId}:`);
                dates.forEach(date => {
                    const images = radarData[date];
                    console.log(`    ${date}: ${images.length} imágenes`);
                    if (images.length > 0) {
                        console.log(`      Primera: ${images[0].timestamp}`);
                        console.log(`      Última: ${images[images.length - 1].timestamp}`);
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testViewerEndpoint();
