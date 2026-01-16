import logoUtpl from '../assets/logo-utpl.png';

// Configuración de radares
const RADAR_CONFIG = {
    'GUAXX': {
        lat: -4.036,
        lon: -79.872,
        radiusKm: 100,
        color: '#6366f1',
        name: 'Celica'
    },
    'LOXX': {
        lat: -3.9960,
        lon: -79.2058,
        radiusKm: 120,
        color: '#10b981',
        name: 'Loja'
    }
};

/**
 * Dibuja un mapa simple con grid y círculo
 */
const drawSimpleMap = (ctx, radarId, x, y, width, height) => {
    const config = RADAR_CONFIG[radarId];
    if (!config) return;

    // Fondo celeste
    ctx.fillStyle = '#e6f2ff';
    ctx.fillRect(x, y, width, height);

    // Grid
    ctx.strokeStyle = '#cce0f0';
    ctx.lineWidth = 1;
    for (let gx = x; gx < x + width; gx += 50) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + height);
        ctx.stroke();
    }
    for (let gy = y; gy < y + height; gy += 50) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + width, gy);
        ctx.stroke();
    }

    // Círculo de cobertura
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) * 0.4;

    ctx.save();
    ctx.fillStyle = config.color + '33';
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Marcador del radar
    ctx.fillStyle = config.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Información
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(x + 20, y + 20, 200, 90);
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 20, y + 20, 200, 90);
    ctx.fillStyle = '#1e3a5f';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Ubicación:', x + 30, y + 40);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(config.name, x + 30, y + 60);
    ctx.fillText(`${config.lat.toFixed(3)}°, ${config.lon.toFixed(3)}°`, x + 30, y + 78);
    ctx.fillText(`Cobertura: ${config.radiusKm} km`, x + 30, y + 96);
};

/**
 * Convierte coordenadas lat/lon a píxeles del canvas basado en los bounds de la imagen
 */
const latLonToPixel = (lat, lon, bounds, imgWidth, imgHeight) => {
    // bounds = [[latMin, lonMin], [latMax, lonMax]]
    const [[latMin, lonMin], [latMax, lonMax]] = bounds;

    // Normalizar coordenadas (0 a 1)
    const x = (lon - lonMin) / (lonMax - lonMin);
    const y = (latMax - lat) / (latMax - latMin); // Invertido porque las latitudes aumentan hacia arriba

    return {
        x: x * imgWidth,
        y: y * imgHeight
    };
};

/**
 * Calcula el radio en píxeles basado en km y escala del mapa
 */
const kmToPixels = (radiusKm, bounds, imgWidth, imgHeight) => {
    const [[latMin, lonMin], [latMax, lonMax]] = bounds;

    // Calcular km por grado en ambas direcciones
    const latRange = latMax - latMin;
    const lonRange = lonMax - lonMin;
    const avgLat = (latMin + latMax) / 2;

    // 1 grado de latitud ≈ 111 km (constante)
    const kmPerDegreeLat = 111;

    // 1 grado de longitud varía con la latitud: 111 * cos(lat)
    const kmPerDegreeLon = 111 * Math.cos(avgLat * Math.PI / 180);

    // Calcular píxeles por km en ambas direcciones
    const totalKmLat = latRange * kmPerDegreeLat;
    const totalKmLon = lonRange * kmPerDegreeLon;

    const pixelsPerKmLat = imgHeight / totalKmLat;
    const pixelsPerKmLon = imgWidth / totalKmLon;

    // Usar el promedio para el radio (círculo se ve igual en ambas direcciones en la proyección)
    const pixelsPerKm = (pixelsPerKmLat + pixelsPerKmLon) / 2;

    return radiusKm * pixelsPerKm;
};

/**
 * Dibuja el círculo del radar en el canvas usando coordenadas geográficas
 */
const drawRadarCircle = (ctx, radarId, bounds, imgWidth, imgHeight, offsetY = 0) => {
    const config = RADAR_CONFIG[radarId];
    if (!config || !bounds) return;

    console.log('[drawRadarCircle] Input:', { radarId, bounds, imgWidth, imgHeight, offsetY });

    // Convertir centro del radar a píxeles
    const center = latLonToPixel(config.lat, config.lon, bounds, imgWidth, imgHeight);
    const radiusPixels = kmToPixels(config.radiusKm, bounds, imgWidth, imgHeight);

    console.log('[drawRadarCircle] Calculated:', { center, radiusPixels, radiusKm: config.radiusKm });

    // Validar que el radio sea positivo
    if (radiusPixels <= 0) {
        console.error('[drawRadarCircle] ERROR: Radio negativo o cero', radiusPixels);
        console.error('[drawRadarCircle] Bounds:', bounds);
        console.error('[drawRadarCircle] Config:', config);
        return; // No dibujar si el radio es inválido
    }

    // Ajustar por offset (header)
    center.y += offsetY;

    // Dibujar círculo
    ctx.save();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radiusPixels, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
};

/**
 * Genera una imagen con marca de agua profesional
 * @param {string} imageUrl - URL de la imagen del mapa completo
 * @param {object} metadata - Metadatos del radar (radar, date)
 * @param {array} bounds - Bounds geográficos [[latMin, lonMin], [latMax, lonMax]]
 */
export const generateWatermarkedImage = async (imageUrl, metadata, bounds = null) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const radarImg = new Image();
        radarImg.crossOrigin = 'anonymous';

        radarImg.onload = () => {
            const imgWidth = radarImg.width;
            const imgHeight = radarImg.height;
            const headerHeight = 100;
            const footerHeight = 120;
            const totalHeight = imgHeight + headerHeight + footerHeight;

            canvas.width = imgWidth;
            canvas.height = totalHeight;

            // Fondo blanco
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // HEADER
            ctx.fillStyle = '#1e3a5f';
            ctx.fillRect(0, 0, canvas.width, headerHeight);

            const logo = new Image();
            logo.src = logoUtpl;

            logo.onload = () => {
                const logoHeight = 70;
                const logoWidth = (logo.width / logo.height) * logoHeight;
                ctx.drawImage(logo, 20, 15, logoWidth, logoHeight);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`Radar: ${metadata.radar}`, imgWidth - 20, 40);
                ctx.font = '18px Arial';
                ctx.fillText(metadata.date, imgWidth - 20, 70);

                // IMAGEN DEL RADAR (mapa completo sin círculo)
                ctx.drawImage(radarImg, 0, headerHeight, imgWidth, imgHeight);

                // Dibujar círculo manualmente si tenemos bounds
                if (bounds && metadata.radar) {
                    drawRadarCircle(ctx, metadata.radar, bounds, imgWidth, imgHeight, headerHeight);
                }

                // FOOTER
                const footerY = headerHeight + imgHeight;
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, footerY, canvas.width, footerHeight);

                ctx.fillStyle = '#1e3a5f';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('Intensidad de Precipitación (dBZ):', 20, footerY + 25);

                const colorScale = [
                    { color: '#00FFFF', label: '0-16', description: 'Ligera' },
                    { color: '#0000FF', label: '16-32', description: 'Moderada' },
                    { color: '#00FF00', label: '32-40', description: 'Fuerte' },
                    { color: '#FFFF00', label: '40-56', description: 'Muy Fuerte' },
                    { color: '#FF8000', label: '56-64', description: 'Intensa' },
                    { color: '#FF0000', label: '64-72', description: 'Muy Intensa' },
                    { color: '#FF00FF', label: '>72', description: 'Extrema' }
                ];

                const startX = 20;
                const startY = footerY + 45;
                const boxWidth = 50;
                const boxHeight = 25;
                const spacing = 10;

                colorScale.forEach((item, index) => {
                    const x = startX + (index * (boxWidth + spacing + 80));
                    ctx.fillStyle = item.color;
                    ctx.fillRect(x, startY, boxWidth, boxHeight);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, startY, boxWidth, boxHeight);
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.label, x + boxWidth / 2, startY + boxHeight + 15);
                    ctx.font = 'bold 11px Arial';
                    ctx.fillText(item.description, x + boxWidth / 2, startY + boxHeight + 30);
                });

                ctx.fillStyle = '#666666';
                ctx.font = '11px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('Universidad Técnica Particular de Loja', imgWidth - 20, footerY + footerHeight - 25);
                ctx.fillText('Sistema de Monitoreo Meteorológico', imgWidth - 20, footerY + footerHeight - 10);

                canvas.toBlob((blob) => resolve(blob), 'image/png');
            };

            logo.onerror = () => {
                console.warn('Logo no cargado');
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('UTPL', 20, 45);
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`Radar: ${metadata.radar}`, imgWidth - 20, 40);
                ctx.font = '18px Arial';
                ctx.fillText(metadata.date, imgWidth - 20, 70);

                // Imagen del radar (sin mapa)
                ctx.drawImage(radarImg, 0, headerHeight, imgWidth, imgHeight);

                const footerY = headerHeight + imgHeight;
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, footerY, canvas.width, footerHeight);
                ctx.fillStyle = '#1e3a5f';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('Intensidad de Precipitación (dBZ):', 20, footerY + 25);

                const colorScale = [
                    { color: '#00FFFF', label: '0-16', description: 'Ligera' },
                    { color: '#0000FF', label: '16-32', description: 'Moderada' },
                    { color: '#00FF00', label: '32-40', description: 'Fuerte' },
                    { color: '#FFFF00', label: '40-56', description: 'Muy Fuerte' },
                    { color: '#FF8000', label: '56-64', description: 'Intensa' },
                    { color: '#FF0000', label: '64-72', description: 'Muy Intensa' },
                    { color: '#FF00FF', label: '>72', description: 'Extrema' }
                ];

                const startX = 20;
                const startY = footerY + 45;
                const boxWidth = 50;
                const boxHeight = 25;
                const spacing = 10;

                colorScale.forEach((item, index) => {
                    const x = startX + (index * (boxWidth + spacing + 80));
                    ctx.fillStyle = item.color;
                    ctx.fillRect(x, startY, boxWidth, boxHeight);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, startY, boxWidth, boxHeight);
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.label, x + boxWidth / 2, startY + boxHeight + 15);
                    ctx.font = 'bold 11px Arial';
                    ctx.fillText(item.description, x + boxWidth / 2, startY + boxHeight + 30);
                });

                ctx.fillStyle = '#666666';
                ctx.font = '11px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('Universidad Técnica Particular de Loja', imgWidth - 20, footerY + footerHeight - 25);
                ctx.fillText('Sistema de Monitoreo Meteorológico', imgWidth - 20, footerY + footerHeight - 10);

                canvas.toBlob((blob) => resolve(blob), 'image/png');
            };
        };

        radarImg.onerror = () => reject(new Error('Error al cargar radar'));
        radarImg.src = imageUrl;
    });
};

/**
 * Descarga imagen con marca de agua
 * @param {string} imageUrl - URL de la imagen
 * @param {string} filename - Nombre del archivo
 * @param {object} metadata - Metadatos del radar
 * @param {array} bounds - Bounds geográficos (opcional)
 */
export const downloadWatermarkedImage = async (imageUrl, filename, metadata, bounds = null) => {
    try {
        const blob = await generateWatermarkedImage(imageUrl, metadata, bounds);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        console.error('Error al generar imagen:', error);
        throw error;
    }
};
