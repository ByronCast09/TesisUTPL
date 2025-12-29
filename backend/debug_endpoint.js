require('dotenv').config();
const axios = require('axios');

async function debugEndpoint() {
    const res = await axios.get('http://localhost:5000/api/radar/LOXX/pngs/viewer-index?date=2025-12-23');
    const frames = res.data.frames || [];

    console.log(`Total frames devueltos por endpoint: ${frames.length}\n`);

    if (frames.length > 0) {
        console.log('Últimos 10 frames:');
        frames.slice(-10).forEach((f, i) => {
            const utc = new Date(f.timestamp);
            const ecuador = new Date(utc.getTime() - 5 * 60 * 60 * 1000);
            console.log(`${frames.length - 10 + i + 1}. ${ecuador.toISOString().substring(11, 19)} Ecuador - ${f.filename}`);
        });

        const last = frames[frames.length - 1];
        const lastEcuador = new Date(new Date(last.timestamp).getTime() - 5 * 60 * 60 * 1000);
        console.log(`\nÚltimo frame: ${lastEcuador.toISOString().substring(11, 19)} Ecuador`);
    }

    // Ahora verificar qué hay en PostgreSQL para 2025-12-24
    const res2 = await axios.get('http://localhost:5000/api/radar/LOXX/pngs/viewer-index?date=2025-12-24');
    const frames24 = res2.data.frames || [];

    console.log(`\n\nFrames para 2025-12-24: ${frames24.length}`);
    if (frames24.length > 0) {
        console.log('Primeros 10 frames del 24:');
        frames24.slice(0, 10).forEach((f, i) => {
            const utc = new Date(f.timestamp);
            const ecuador = new Date(utc.getTime() - 5 * 60 * 60 * 1000);
            console.log(`${i + 1}. UTC: ${utc.toISOString().substring(11, 19)} → Ecuador: ${ecuador.toISOString().substring(11, 19)} - ${f.filename}`);
        });
    }

    process.exit(0);
}

debugEndpoint();
