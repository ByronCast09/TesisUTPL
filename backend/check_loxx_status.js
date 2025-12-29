/**
 * Verifica el estado completo de sincronización de LOXX
 */
const radarMetadataRepository = require('./services/radarMetadataRepository');

async function checkLoxxStatus() {
    console.log('📊 VERIFICANDO ESTADO DE SINCRONIZACIÓN LOXX');
    console.log('='.repeat(70));

    try {
        // Obtener total de frames
        const allFrames = await radarMetadataRepository.listProcessed({
            radarId: 'LOXX',
            limit: 50000
        });

        console.log(`\n✅ Total frames en PostgreSQL: ${allFrames.length}`);

        // Agrupar por fecha
        const framesByDate = {};
        allFrames.forEach(frame => {
            const date = new Date(frame.source_timestamp);
            const dateStr = date.toISOString().split('T')[0];

            if (!framesByDate[dateStr]) {
                framesByDate[dateStr] = 0;
            }
            framesByDate[dateStr]++;
        });

        // Ordenar fechas
        const dates = Object.keys(framesByDate).sort();

        console.log(`\n📅 Rango de datos:`);
        console.log(`   Primera fecha: ${dates[0]}`);
        console.log(`   Última fecha: ${dates[dates.length - 1]}`);
        console.log(`   Total días con datos: ${dates.length}`);

        // Mostrar últimos 10 días
        console.log(`\n📊 Últimos 10 días:`);
        const last10 = dates.slice(-10);
        last10.forEach(date => {
            const count = framesByDate[date];
            const expected = 288; // 24h * 60min / 5min
            const percentage = ((count / expected) * 100).toFixed(1);
            const status = count >= expected * 0.9 ? '✅' : count >= expected * 0.5 ? '⚠️' : '❌';
            console.log(`   ${status} ${date}: ${count} frames (${percentage}% completo)`);
        });

        // Verificar hoy
        const today = new Date().toISOString().split('T')[0];
        const todayCount = framesByDate[today] || 0;

        console.log(`\n🎯 HOY (${today}):`);
        console.log(`   Frames: ${todayCount}`);

        // Calcular frames esperados según la hora actual
        const now = new Date();
        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
        const expectedFramesToday = Math.floor(minutesSinceMidnight / 5);

        console.log(`   Esperados hasta ahora: ${expectedFramesToday}`);
        console.log(`   ${todayCount >= expectedFramesToday * 0.9 ? '✅' : '⚠️'} ${((todayCount / expectedFramesToday) * 100).toFixed(1)}% sincronizado`);

        // Calcular frames por hora en las últimas 24h
        const last24h = allFrames.filter(f => {
            const age = Date.now() - new Date(f.source_timestamp).getTime();
            return age <= 24 * 60 * 60 * 1000;
        });

        console.log(`\n📈 Últimas 24 horas:`);
        console.log(`   Frames: ${last24h.length}`);
        console.log(`   Esperados: 288 (1 cada 5 min)`);
        console.log(`   ${last24h.length >= 260 ? '✅' : '⚠️'} ${((last24h.length / 288) * 100).toFixed(1)}% completo`);

        // Verificar si está actualizado
        if (last24h.length > 0) {
            const latest = last24h.reduce((a, b) =>
                new Date(a.source_timestamp) > new Date(b.source_timestamp) ? a : b
            );

            const latestTime = new Date(latest.source_timestamp);
            const ageMinutes = Math.floor((Date.now() - latestTime.getTime()) / (60 * 1000));

            console.log(`\n⏱️  Último frame sincronizado:`);
            console.log(`   Timestamp: ${latestTime.toISOString()}`);
            console.log(`   Hace: ${ageMinutes} minutos`);
            console.log(`   ${ageMinutes <= 15 ? '✅ Actualizado' : '⚠️ Atrasado'}`);
        }

        console.log('\n' + '='.repeat(70));

        // Conclusión
        if (todayCount >= expectedFramesToday * 0.9 && last24h.length >= 260) {
            console.log('✅ SINCRONIZACIÓN COMPLETA - Todo funcionando correctamente');
            console.log('   El visor mostrará datos actualizados para cualquier día');
        } else {
            console.log('⚠️ SINCRONIZACIÓN INCOMPLETA - Faltan algunos archivos');
            console.log('   Espera a que se complete la sincronización automática');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

checkLoxxStatus();
