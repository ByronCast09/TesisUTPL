const repo = require('./services/radarMetadataRepository');

async function checkAll() {
    // Sin filtro de fecha
    const all = await repo.listProcessed({
        limit: 1000
    });

    console.log('Total frames en PostgreSQL:', all.length);

    if (all.length > 0) {
        // Ver radares únicos
        const radars = [...new Set(all.map(f => f.radar_id))];
        console.log('Radares:', radars);

        // Contar por radar
        radars.forEach(radarId => {
            const count = all.filter(f => f.radar_id === radarId).length;
            console.log(`  ${radarId}: ${count} frames`);
        });

        // Ver rango de fechas
        const timestamps = all.map(f => new Date(f.source_timestamp));
        const min = new Date(Math.min(...timestamps));
        const max = new Date(Math.max(...timestamps));
        console.log('\nRango de fechas:');
        console.log('  Desde:', min.toISOString());
        console.log('  Hasta:', max.toISOString());
    }

    process.exit(0);
}

checkAll().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
