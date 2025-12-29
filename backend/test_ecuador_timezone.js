require('dotenv').config();
const axios = require('axios');

async function testEcuadorDate() {
    const today = '2025-12-23'; // Fecha local Ecuador

    console.log('📅 Verificando frames para 23-dic-2025 (Ecuador)\n');

    const res = await axios.get(`http://localhost:5000/api/radar/LOXX/pngs/viewer-index?date=${today}`);
    const frames = res.data.frames || [];

    console.log(`Frames encontrados: ${frames.length}`);

    if (frames.length > 0) {
        // Convertir timestamps UTC a hora Ecuador
        const toEcuadorTime = (utcStr) => {
            const utc = new Date(utcStr);
            const ecuador = new Date(utc.getTime() - 5 * 60 * 60 * 1000);
            return ecuador.toISOString().replace('T', ' ').substring(0, 19) + ' ECT';
        };

        console.log('\nPrimer frame:');
        console.log('  UTC:', frames[0].timestamp);
        console.log('  Ecuador:', toEcuadorTime(frames[0].timestamp));

        console.log('\nÚltimo frame:');
        console.log('  UTC:', frames[frames.length - 1].timestamp);
        console.log('  Ecuador:', toEcuadorTime(frames[frames.length - 1].timestamp));

        // Verificar que todos estén dentro del rango 00:00-23:59:59 Ecuador
        let allInRange = true;
        frames.forEach(f => {
            const ecuador = new Date(new Date(f.timestamp).getTime() - 5 * 60 * 60 * 1000);
            const dateStr = ecuador.toISOString().split('T')[0];
            if (dateStr !== today) {
                console.log(`⚠️ Frame fuera de rango: ${f.timestamp} → ${dateStr}`);
                allInRange = false;
            }
        });

        if (allInRange) {
            console.log('\n✅ Todos los frames están dentro del día 23-dic Ecuador (00:00-23:59:59)');
        }
    } else {
        console.log('⚠️ No hay frames para hoy');
    }

    process.exit(0);
}

testEcuadorDate();
