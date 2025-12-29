import React, { useEffect, useRef, useState } from 'react';
import { ImageOverlay } from 'react-leaflet';

/**
 * Componente que procesa imágenes de radar eliminando el fondo magenta
 * y convirtiéndolo en transparente
 */
const TransparentRadarOverlay = ({ imageUrl, url, bounds, opacity = 0.7, zIndex, radarId }) => {
    // Usar imageUrl como prioridad, luego url para compatibilidad
    const sourceUrl = imageUrl || url;

    const [processedUrl, setProcessedUrl] = useState(null);

    useEffect(() => {
        if (!sourceUrl || !bounds) {
            setProcessedUrl(null);
            return;
        }

        console.log(`[TransparentRadarOverlay] Starting for ${radarId}:`, sourceUrl);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            console.log(`[TransparentRadarOverlay] Image loaded for ${radarId}`);
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                canvas.width = img.width;
                canvas.height = img.height;

                // Dibujar imagen original
                ctx.drawImage(img, 0, 0);

                // Obtener datos de píxeles
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // PRIMERO: Analizar si la imagen necesita procesamiento
                let transparentPixels = 0;
                let magentaPixels = 0;
                const totalPixels = canvas.width * canvas.height;
                const sampleSize = Math.min(totalPixels, 10000); // Muestrear máximo 10k píxeles
                const sampleStep = Math.floor(totalPixels / sampleSize);

                for (let i = 0; i < data.length; i += 4 * sampleStep) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    if (a === 0) {
                        transparentPixels++;
                    }

                    // Detectar magenta
                    const isMagenta = (Math.abs(r - b) < 50 && r > g + 20 && b > g + 20) ||
                        (r > 180 && b > 180 && g < 120) ||
                        (r === 255 && g === 0 && b === 255);

                    if (isMagenta) {
                        magentaPixels++;
                    }
                }

                const transparencyRatio = transparentPixels / sampleSize;
                const magentaRatio = magentaPixels / sampleSize;

                console.log(`[TransparentRadarOverlay] Stats for ${radarId}: ${(transparencyRatio * 100).toFixed(1)}% transparent, ${(magentaRatio * 100).toFixed(1)}% magenta`);

                // Si la imagen ya tiene transparencia adecuada y poco magenta, usarla directamente
                if (transparencyRatio > 0.5 && magentaRatio < 0.01) {
                    console.log(`[TransparentRadarOverlay] Image has good transparency, using directly for ${radarId}`);
                    setProcessedUrl(sourceUrl);
                    return;
                }

                // Si tiene mucho magenta, procesarla
                if (magentaRatio > 0.01) {
                    console.log(`[TransparentRadarOverlay] Processing magenta pixels for ${radarId}`);
                    let processedPixels = 0;

                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        const isMagentaFamily = (
                            (Math.abs(r - b) < 50 && r > g + 20 && b > g + 20) ||
                            (r > 180 && b > 180 && g < 120) ||
                            (r === 255 && g === 0 && b === 255)
                        );

                        if (isMagentaFamily) {
                            data[i + 3] = 0; // Alpha = 0 (transparente)
                            processedPixels++;
                        }
                    }

                    console.log(`[TransparentRadarOverlay] Processed ${processedPixels} magenta pixels for ${radarId}`);

                    // Aplicar cambios
                    ctx.putImageData(imageData, 0, 0);
                }

                // Convertir a blob y crear URL
                canvas.toBlob((blob) => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        console.log(`[TransparentRadarOverlay] Created blob URL for ${radarId}`);
                        setProcessedUrl(blobUrl);
                    } else {
                        console.warn(`[TransparentRadarOverlay] Failed to create blob for ${radarId}, using original`);
                        setProcessedUrl(sourceUrl);
                    }
                }, 'image/png');
            } catch (error) {
                console.error(`[TransparentRadarOverlay] Error processing ${radarId}:`, error);
                setProcessedUrl(sourceUrl); // Fallback: usar original
            }
        };

        img.onerror = (error) => {
            console.error(`[TransparentRadarOverlay] Failed to load ${radarId} from:`, sourceUrl);
            console.error('Error details:', error);
            // Intentar usar la URL original de todos modos (puede funcionar en ImageOverlay)
            setProcessedUrl(sourceUrl);
        };

        img.src = sourceUrl;

        // Cleanup: revocar URL anterior
        return () => {
            if (processedUrl && processedUrl.startsWith('blob:')) {
                URL.revokeObjectURL(processedUrl);
            }
        };
    }, [sourceUrl, radarId]);

    // Convertir bounds si es necesario
    let leafletBounds = bounds;
    if (bounds && bounds.northEast && bounds.southWest) {
        leafletBounds = [
            [bounds.southWest[0], bounds.southWest[1]],
            [bounds.northEast[0], bounds.northEast[1]]
        ];
    }

    // Esperar a que se procese la imagen
    if (!processedUrl) {
        return null;
    }

    return (
        <ImageOverlay
            url={processedUrl}
            bounds={leafletBounds}
            opacity={opacity}
            zIndex={zIndex || 1000}
        />
    );
};

export default TransparentRadarOverlay;
