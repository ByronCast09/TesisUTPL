const repo = require('./services/radarMetadataRepository');

repo.listProcessed({ limit: 500 }).then(r => {
    const loxx = r.filter(f => f.radar_id && (f.radar_id.toUpperCase().includes('LOXX') || f.radar_id.toUpperCase().includes('OXX')));
    const lguaxx = r.filter(f => f.radar_id && f.radar_id.toUpperCase().includes('GUAXX'));

    console.log('Total frames:', r.length);
    console.log('LOXX frames:', loxx.length);
    console.log('LGUAXX frames:', lguaxx.length);

    if (loxx.length > 0) {
        console.log('\nEjemplo LOXX radarId:', loxx[0].radar_id);
        console.log('Timestamp:', loxx[0].source_timestamp);
    }

    if (r.length > 0) {
        const allRadarIds = [...new Set(r.map(f => f.radar_id))];
        console.log('\nTodos los radarIds únicos:', allRadarIds);
    }

    process.exit(0);
});
