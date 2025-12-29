require('dotenv').config();
const repo = require('./services/radarMetadataRepository');

async function checkLatest() {
    // Traer los últimos 20 frames
    const latest = await repo.listProcessed({
        radarId: 'LOXX',
        limit: 20
    });

    console.log('Últimos 20 frames de LOXX en PostgreSQL:\n');

    latest.forEach((f, i) => {
        const utc = new Date(f.source_timestamp);
        const ecuador = new Date(utc.getTime() - 5 * 60 * 60 * 1000);

        const utcStr = utc.toISOString().substring(11, 19);
        const ecuadorStr = ecuador.toISOString().substring(11, 19);
        const ecuadorDate = ecuador.toISOString().split('T')[0];

        console.log(`${i + 1}. ${f.filename}`);
        console.log(`   UTC: ${utcStr} | Ecuador: ${ecuadorStr} (${ecuadorDate})`);
    });

    if (latest.length > 0) {
        const newest = latest[0];
        const ecuadorTime = new Date(new Date(newest.source_timestamp).getTime() - 5 * 60 * 60 * 1000);
        console.log(`\n✅ Frame más reciente: ${ecuadorTime.toISOString().substring(0, 19)} Ecuador`);

        const now = new Date();
        const ecuadorNow = new Date(now.getTime() - 5 * 60 * 60 * 1000);
        const minutesOld = Math.floor((now.getTime() - new Date(newest.source_timestamp).getTime()) / 60000);

        console.log(`   Hora actual Ecuador: ${ecuadorNow.toISOString().substring(11, 19)}`);
        console.log(`   Antigüedad: ${minutesOld} minutos`);
    }

    process.exit(0);
}

checkLatest();
