require('dotenv').config();
const repo = require('./services/radarMetadataRepository');
const moment = require('moment-timezone');

async function testMoment() {
    const frames = await repo.listProcessed({ radarId: 'LOXX', limit: 5 });

    console.log('Testing moment-timezone conversion:\n');

    frames.forEach(f => {
        const utc = new Date(f.source_timestamp);

        // Método 1: moment con timezone
        const m1 = moment(f.source_timestamp).tz('America/Guayaquil');
        const date1 = m1.format('YYYY-MM-DD');
        const time1 = m1.format('HH:mm:ss');

        // Método 2: moment.utc explícito
        const m2 = moment.utc(f.source_timestamp).tz('America/Guayaquil');
        const date2 = m2.format('YYYY-MM-DD');
        const time2 = m2.format('HH:mm:ss');

        console.log(`Archivo: ${f.filename}`);
        console.log(`  Timestamp original: ${f.source_timestamp}`);
        console.log(`  UTC: ${utc.toISOString()}`);
        console.log(`  Moment método 1: ${date1} ${time1}`);
        console.log(`  Moment método 2: ${date2} ${time2}`);
        console.log();
    });

    process.exit(0);
}

testMoment();
