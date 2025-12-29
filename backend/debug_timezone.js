require('dotenv').config();
const repo = require('./services/radarMetadataRepository');

async function debugTimezone() {
    const frames = await repo.listProcessed({ radarId: 'LOXX', limit: 20 });

    console.log('Verificando conversión de timezone para últimos 20 frames:\n');

    frames.forEach(f => {
        const utcDate = new Date(f.source_timestamp);
        const utcStr = utcDate.toISOString();

        // Conversión incorrecta (sumar offset negativo)
        const ecuadorWrong = new Date(utcDate.getTime() + (-5 * 60) * 60 * 1000);

        // Conversión correcta (restar 5 horas)
        const ecuadorCorrect = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000);

        const utcDay = utcStr.split('T')[0];
        const wrongDay = ecuadorWrong.toISOString().split('T')[0];
        const correctDay = ecuadorCorrect.toISOString().split('T')[0];

        console.log(`UTC: ${utcStr.substring(0, 19)} (día: ${utcDay})`);
        console.log(`  Ecuador (forma incorrecta): ${ecuadorWrong.toISOString().substring(0, 19)} (día: ${wrongDay})`);
        console.log(`  Ecuador (forma correcta):   ${ecuadorCorrect.toISOString().substring(0, 19)} (día: ${correctDay})`);
        console.log(`  Archivo: ${f.filename}\n`);
    });

    process.exit(0);
}

debugTimezone();
