require('dotenv').config();
const repo = require('./services/radarMetadataRepository');

async function checkByDate() {
    const all = await repo.listProcessed({
        radarId: 'LOXX',
        limit: 10000
    });

    console.log('Total frames LOXX:', all.length);

    // Agrupar por fecha (usando timestamp)
    const byDate = {};
    all.forEach(f => {
        const date = f.source_timestamp.toISOString().split('T')[0];
        if (!byDate[date]) byDate[date] = 0;
        byDate[date]++;
    });

    console.log('\nFrames por fecha (UTC):');
    Object.keys(byDate).sort().forEach(date => {
        console.log(`  ${date}: ${byDate[date]} frames`);
    });

    // Ver últimos 5 frames
    console.log('\nÚltimos 5 frames:');
    all.slice(0, 5).forEach(f => {
        console.log(`  ${f.source_timestamp.toISOString()} - ${f.filename}`);
    });

    process.exit(0);
}

checkByDate();
