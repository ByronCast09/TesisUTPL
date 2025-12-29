const repo = require('./services/radarMetadataRepository');

async function checkLoxxToday() {
    const today = new Date().toISOString().split('T')[0];

    // Verificar con diferentes filtros
    console.log('Verificando LOXX para hoy:', today);

    // Intento 1: Con radarId exacto
    const result1 = await repo.listProcessed({
        radarId: 'LOXX',
        limit: 5000
    });

    console.log('\nCon radarId="LOXX":', result1.length, 'frames');

    // Intento 2: Sin radarId, filtrar después
    const result2 = await repo.listProcessed({
        limit: 5000
    });

    const loxxFrames = result2.filter(f =>
        f.radar_id && f.radar_id.toUpperCase().includes('LOXX')
    );

    console.log('Sin filtro radarId (después filtrado):', loxxFrames.length, 'frames');

    // Ver IDs únicos
    const uniqueRadarIds = [...new Set(result2.map(f => f.radar_id))];
    console.log('\nRadar IDs únicos en DB:', uniqueRadarIds);

    // Frames de hoy
    if (loxxFrames.length > 0) {
        const todayFrames = loxxFrames.filter(f => {
            const frameDate = new Date(f.source_timestamp).toISOString().split('T')[0];
            return frameDate === today;
        });

        console.log('\nFrames LOXX de hoy (' + today + '):', todayFrames.length);

        if (todayFrames.length > 0) {
            const first = todayFrames[0];
            const last = todayFrames[todayFrames.length - 1];
            console.log('Primer frame:', new Date(first.source_timestamp).toISOString());
            console.log('Último frame:', new Date(last.source_timestamp).toISOString());
        }
    }

    process.exit(0);
}

checkLoxxToday().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
