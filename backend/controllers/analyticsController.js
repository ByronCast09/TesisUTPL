const radarMetadataRepository = require('../services/radarMetadataRepository');

/**
 * Obtiene métricas agregadas para el período especificado
 * GET /api/analytics/metrics?period=today|week|month
 */
exports.getMetrics = async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const month = req.query.month ? parseInt(req.query.month) : null;
        const year = req.query.year ? parseInt(req.query.year) : null;

        console.log('[Analytics] getMetrics called:', { period, month, year });

        const { startDate, endDate } = getPeriodDates(period, month, year);
        console.log('[Analytics] Date range:', { startDate, endDate });

        // Consultar datos del período
        const products = await radarMetadataRepository.listProcessed({
            from: startDate,
            to: endDate,
            productType: 'ppi_png'
        });

        if (!products || products.length === 0) {
            return res.json({
                success: true,
                totalPrecipitation: 0,
                maxIntensity: 0,
                registeredEvents: 0,
                activeAlerts: 0
            });
        }

        // Calcular métricas
        let totalPrecipitation = 0;
        let maxIntensity = 0;
        const events = products.length;

        products.forEach(product => {
            const metadata = product.metadata || {};
            const maxDbz = extractMaxDbz(metadata);

            if (maxDbz > maxIntensity) {
                maxIntensity = maxDbz;
            }

            // Estimar precipitación (Marshall-Palmer)
            const precipitation = dbzToPrecipitation(maxDbz);
            totalPrecipitation += precipitation;
        });

        // Alertas activas (eventos con intensidad > 45 dBZ en las últimas 2 horas)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const recentHighIntensity = products.filter(p => {
            const timestamp = new Date(p.source_timestamp);
            const maxDbz = extractMaxDbz(p.metadata || {});
            return timestamp >= twoHoursAgo && maxDbz >= 45;
        });

        return res.json({
            success: true,
            totalPrecipitation: parseFloat(totalPrecipitation.toFixed(1)),
            maxIntensity: parseFloat(maxIntensity.toFixed(1)),
            registeredEvents: events,
            activeAlerts: recentHighIntensity.length
        });

    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener métricas',
            error: error.message
        });
    }
};

/**
 * Obtiene evolución temporal (GUAXX vs LOXX)
 * GET /api/analytics/temporal?period=today|week|month
 */
exports.getTemporalEvolution = async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const month = req.query.month ? parseInt(req.query.month) : null;
        const year = req.query.year ? parseInt(req.query.year) : null;

        console.log('[Analytics] ⏰ getTemporalEvolution called:', { period, month, year });

        const { startDate, endDate } = getPeriodDates(period, month, year);

        // Obtener datos de ambos radares
        const guaxxData = await radarMetadataRepository.listProcessed({
            radarId: 'LGUAXX',
            from: startDate,
            to: endDate,
            productType: 'ppi_png'
        });

        const loxxData = await radarMetadataRepository.listProcessed({
            radarId: 'LOXX',
            from: startDate,
            to: endDate,
            productType: 'ppi_png'
        });

        // Agrupar por intervalos de tiempo
        const interval = period === 'today' ? 30 * 60 * 1000 : 60 * 60 * 1000; // 30min o 1h
        const timeGroups = {};

        const processRadarData = (data, radarKey) => {
            data.forEach(product => {
                const timestamp = new Date(product.source_timestamp);
                const timeKey = Math.floor(timestamp.getTime() / interval) * interval;

                if (!timeGroups[timeKey]) {
                    timeGroups[timeKey] = { time: new Date(timeKey), GUAXX: [], LOXX: [] };
                }

                const maxDbz = extractMaxDbz(product.metadata || {});
                timeGroups[timeKey][radarKey].push(maxDbz);
            });
        };

        processRadarData(guaxxData, 'GUAXX');
        processRadarData(loxxData, 'LOXX');

        console.log('[Analytics] Temporal Evolution - Data fetched:', {
            guaxxCount: guaxxData.length,
            loxxCount: loxxData.length,
            sampleGUAXX: guaxxData[0] ? {
                filename: guaxxData[0].filename,
                metadata: guaxxData[0].metadata,
                maxDbz: extractMaxDbz(guaxxData[0].metadata)
            } : null,
            sampleLOXX: loxxData[0] ? {
                filename: loxxData[0].filename,
                metadata: loxxData[0].metadata,
                maxDbz: extractMaxDbz(loxxData[0].metadata)
            } : null
        });

        // Calcular promedios y formatear
        const result = Object.values(timeGroups)
            .map(group => ({
                time: formatTime(group.time, period),
                GUAXX: group.GUAXX.length > 0
                    ? parseFloat((group.GUAXX.reduce((a, b) => a + b, 0) / group.GUAXX.length).toFixed(1))
                    : 0,
                LOXX: group.LOXX.length > 0
                    ? parseFloat((group.LOXX.reduce((a, b) => a + b, 0) / group.LOXX.length).toFixed(1))
                    : 0
            }))
            .sort((a, b) => a.time.localeCompare(b.time));

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error obteniendo evolución temporal:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener evolución temporal',
            error: error.message
        });
    }
};

/**
 * Obtiene datos por provincia
 * GET /api/analytics/provinces?period=today|week|month
 */
exports.getProvinceData = async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const month = req.query.month ? parseInt(req.query.month) : null;
        const year = req.query.year ? parseInt(req.query.year) : null;

        console.log('[Analytics] 🗺️ getProvinceData called:', { period, month, year });

        const { startDate, endDate } = getPeriodDates(period, month, year);

        const products = await radarMetadataRepository.listProcessed({
            from: startDate,
            to: endDate,
            productType: 'ppi_png'
        });

        // Mapeo simplificado: LGUAXX cubre Loja, LOXX cubre El Oro y Zamora
        const provinces = {
            Loja: [],
            'El Oro': [],
            Zamora: []
        };

        products.forEach(product => {
            const maxDbz = extractMaxDbz(product.metadata || {});

            if (product.radar_id === 'LGUAXX') {
                provinces.Loja.push(maxDbz);
            } else if (product.radar_id === 'LOXX') {
                // Distribuir entre El Oro y Zamora (simplificado)
                provinces['El Oro'].push(maxDbz);
                provinces.Zamora.push(maxDbz * 0.9); // Ajuste aproximado
            }
        });

        const result = Object.entries(provinces).map(([name, values]) => ({
            name,
            value: values.length > 0
                ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1))
                : 0
        }));

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error obteniendo datos por provincia:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener datos por provincia',
            error: error.message
        });
    }
};

/**
 * Obtiene distribución de intensidad
 * GET /api/analytics/intensity?period=today|week|month
 */
exports.getIntensityDistribution = async (req, res) => {
    try {
        const { period = 'today' } = req.query;
        const month = req.query.month ? parseInt(req.query.month) : null;
        const year = req.query.year ? parseInt(req.query.year) : null;

        console.log('[Analytics] 🎨 getIntensityDistribution called:', { period, month, year });

        const { startDate, endDate } = getPeriodDates(period, month, year);

        const products = await radarMetadataRepository.listProcessed({
            from: startDate,
            to: endDate,
            productType: 'ppi_png'
        });

        const distribution = {
            baja: 0,      // < 30 dBZ
            moderada: 0,  // 30-45 dBZ
            alta: 0,      // 45-55 dBZ
            muyAlta: 0    // > 55 dBZ
        };

        products.forEach(product => {
            const maxDbz = extractMaxDbz(product.metadata || {});

            if (maxDbz < 30) distribution.baja++;
            else if (maxDbz < 45) distribution.moderada++;
            else if (maxDbz < 55) distribution.alta++;
            else distribution.muyAlta++;
        });

        const total = products.length || 1;
        const result = [
            { name: 'Baja', value: Math.round((distribution.baja / total) * 100), color: '#6B7280' },
            { name: 'Moderada', value: Math.round((distribution.moderada / total) * 100), color: '#3B82F6' },
            { name: 'Alta', value: Math.round((distribution.alta / total) * 100), color: '#F59E0B' },
            { name: 'Muy Alta', value: Math.round((distribution.muyAlta / total) * 100), color: '#EF4444' }
        ];

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error obteniendo distribución de intensidad:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener distribución',
            error: error.message
        });
    }
};

/**
 * Obtiene tendencia semanal
 * GET /api/analytics/weekly?period=today|week|month
 */
exports.getWeeklyTrend = async (req, res) => {
    try {
        const { period = 'week' } = req.query;
        const month = req.query.month ? parseInt(req.query.month) : null;
        const year = req.query.year ? parseInt(req.query.year) : null;

        console.log('[Analytics] 📅 getWeeklyTrend called:', { period, month, year });

        const { startDate, endDate } = getPeriodDates(period, month, year);

        const products = await radarMetadataRepository.listProcessed({
            from: startDate,
            to: endDate,
            productType: 'ppi_png'
        });

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const dayData = Array(7).fill(0).map((_, i) => ({
            day: dayNames[i],
            values: []
        }));

        products.forEach(product => {
            const day = new Date(product.source_timestamp).getDay();
            const maxDbz = extractMaxDbz(product.metadata || {});
            dayData[day].values.push(maxDbz);
        });

        const result = dayData.map(d => ({
            day: d.day,
            value: d.values.length > 0
                ? parseFloat((d.values.reduce((a, b) => a + b, 0) / d.values.length).toFixed(1))
                : 0
        }));

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error obteniendo tendencia semanal:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener tendencia semanal',
            error: error.message
        });
    }
};

// ============= Funciones Auxiliares =============

function getPeriodDates(period, month = null, year = null) {
    let endDate = new Date();
    let startDate;

    // Si es custom, usar el mes/año especificado
    if (period === 'custom' && month !== null && year !== null) {
        startDate = new Date(year, month, 1); // Primer día del mes
        endDate = new Date(year, month + 1, 0, 23, 59, 59); // Último día del mes
        return { startDate, endDate };
    }

    switch (period) {
        case 'today':
            startDate = new Date(endDate);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(endDate);
            startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
}

function extractMaxDbz(metadata) {
    if (!metadata) return 0;

    let meta = metadata;
    if (typeof meta === 'string') {
        try {
            meta = JSON.parse(meta);
        } catch (e) {
            return 0;
        }
    }

    // Buscar en diferentes ubicaciones
    return meta.metadata?.maxDbz || meta.maxDbz || meta.stats?.max || meta.max || 0;
}

function dbzToPrecipitation(dbz) {
    if (dbz <= 0) return 0;
    const Z = Math.pow(10, dbz / 10);
    const R = Math.pow(Z / 200, 1 / 1.6);
    return R;
}

function formatTime(date, period) {
    if (period === 'today') {
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}
