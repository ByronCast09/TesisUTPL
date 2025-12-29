const { PNG } = require('pngjs');
const fs = require('fs').promises;

/**
 * Analiza una imagen PNG de radar y extrae estadísticas de reflectividad
 * @param {Buffer} pngBuffer - Buffer de la imagen PNG
 * @returns {Object} - Estadísticas extraídas {maxDbz, minDbz, avgDbz, pixelCount, hasData}
 */
async function analyzePngRadarData(pngBuffer) {
    return new Promise((resolve, reject) => {
        try {
            const png = new PNG();

            png.parse(pngBuffer, (error, data) => {
                if (error) {
                    return reject(error);
                }

                const stats = {
                    maxDbz: 0,
                    minDbz: 255,
                    avgDbz: 0,
                    totalDbz: 0,
                    pixelCount: 0,
                    dataPixels: 0,
                    hasData: false
                };

                // Analizar cada pixel
                // Las imágenes de radar suelen codificar reflectividad en el canal rojo o verde
                for (let y = 0; y < data.height; y++) {
                    for (let x = 0; x < data.width; x++) {
                        const idx = (data.width * y + x) << 2;

                        const r = data.data[idx];
                        const g = data.data[idx + 1];
                        const b = data.data[idx + 2];
                        const a = data.data[idx + 3];

                        // Ignorar pixeles transparentes (sin datos)
                        if (a < 10) continue;

                        stats.pixelCount++;

                        // Convertir RGB a valor de reflectividad estimado
                        // Usualmente el valor de reflectividad se codifica en escala de grises o color
                        // Asumiendo que valores más altos = mayor reflectividad
                        const intensity = Math.max(r, g, b);

                        if (intensity > 0) {
                            stats.dataPixels++;
                            stats.hasData = true;

                            // Convertir intensidad de pixel (0-255) a dBZ aproximado (0-70)
                            // Esta es una conversión estimada, ajusta según tu esquema de colores
                            const dbz = (intensity / 255) * 70;

                            stats.totalDbz += dbz;

                            if (dbz > stats.maxDbz) {
                                stats.maxDbz = dbz;
                            }
                            if (dbz < stats.minDbz && dbz > 0) {
                                stats.minDbz = dbz;
                            }
                        }
                    }
                }

                // Calcular promedio
                if (stats.dataPixels > 0) {
                    stats.avgDbz = stats.totalDbz / stats.dataPixels;
                }

                // Si no hay datos, resetear minDbz
                if (!stats.hasData) {
                    stats.minDbz = 0;
                }

                resolve({
                    maxDbz: parseFloat(stats.maxDbz.toFixed(2)),
                    minDbz: parseFloat(stats.minDbz.toFixed(2)),
                    avgDbz: parseFloat(stats.avgDbz.toFixed(2)),
                    pixelCount: stats.pixelCount,
                    dataPixels: stats.dataPixels,
                    hasData: stats.hasData,
                    width: data.width,
                    height: data.height
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Analiza un archivo PNG desde disco
 * @param {string} filePath - Ruta al archivo PNG
 * @returns {Object} - Estadísticas extraídas
 */
async function analyzePngFile(filePath) {
    try {
        const buffer = await fs.readFile(filePath);
        return await analyzePngRadarData(buffer);
    } catch (error) {
        console.error(`Error analizando ${filePath}:`, error.message);
        throw error;
    }
}

module.exports = {
    analyzePngRadarData,
    analyzePngFile
};
