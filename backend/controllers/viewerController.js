const radarMetadataRepository = require('../services/radarMetadataRepository');

/**
 * Endpoint simplificado que devuelve todos los frames recientes
 * El frontend se encarga de filtrar por fecha local
 */
exports.getPngIndexForViewerSimple = async (req, res) => {
    try {
        const { radarId } = req.params;

        // Obtener frames recientes (últimos 1000 para cubrir ~3 días)
        const products = await radarMetadataRepository.listProcessed({
            radarId: radarId.toUpperCase(),
            productType: 'ppi_png',
            limit: 1000
        });

        if (!products || products.length === 0) {
            return res.json({
                success: true,
                radar: radarId,
                frames: [],
                source: 'postgresql'
            });
        }

        // Crear array simple de frames
        const allFrames = products.map(product => ({
            filename: product.filename,
            url: `/api/radar/pngs/${product.id}/image`,
            timestamp: product.source_timestamp.toISOString(),
            bounds: product.metadata?.bounds || null,
            metadata: {
                ...product.metadata,
                sourceTimestamp: product.source_timestamp.toISOString()
            }
        }));

        // Ordenar por timestamp descendente (más recientes primero)
        allFrames.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return res.json({
            success: true,
            radar: radarId,
            frames: allFrames,
            totalFrames: allFrames.length,
            source: 'postgresql'
        });
    } catch (error) {
        console.error('Error al obtener frames:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener frames',
            error: error.message
        });
    }
};
