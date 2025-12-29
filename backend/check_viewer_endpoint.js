const axios = require('axios');

axios.get('http://localhost:5000/api/radar/LOXX/pngs/viewer-index?date=2025-12-23')
    .then(response => {
        const data = response.data;
        const loxxIndex = data.index?.LOXX || {};
        const today = '2025-12-23';
        const todayFrames = loxxIndex[today] || [];

        console.log('📊 RESULTADOS DEL ENDPOINT viewer-index:');
        console.log('Total frames hoy (2025-12-23):', todayFrames.length);
        console.log('Total fechas disponibles:', Object.keys(loxxIndex).length);
        console.log('Fechas:', Object.keys(loxxIndex).sort());

        // Contar total de frames en todas las fechas
        const totalFrames = Object.values(loxxIndex).reduce((sum, frames) => sum + frames.length, 0);
        console.log('Total frames (todas las fechas):', totalFrames);

        if (todayFrames.length > 0) {
            const first = todayFrames[0];
            const last = todayFrames[todayFrames.length - 1];
            console.log('\nPrimer frame:', first.timestamp);
            console.log('Último frame:', last.timestamp);
        }

        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
