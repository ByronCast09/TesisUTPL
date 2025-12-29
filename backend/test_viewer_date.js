const axios = require('axios');

async function test() {
    const today = new Date().toISOString().split('T')[0];
    console.log('Fecha actual UTC:', today);

    const res = await axios.get(`http://localhost:5000/api/radar/LOXX/pngs/viewer-index?date=${today}`);
    console.log('\nResultado del endpoint:');
    console.log('  Frames recibidos:', res.data.frames?.length || 0);
    console.log('  Fechas disponibles:', res.data.dates?.slice(-5));
    console.log('  Fecha solicitada encontrada:', res.data.dates?.includes(today) ? 'SÍ' : 'NO');

    if (res.data.frames?.length > 0) {
        console.log('\n  Primer frame:', res.data.frames[0].timestamp);
        console.log('  Último frame:', res.data.frames[res.data.frames.length - 1].timestamp);
    }

    process.exit(0);
}

test();
