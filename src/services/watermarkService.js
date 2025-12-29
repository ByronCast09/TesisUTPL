import logoUtpl from '../assets/logo-utpl.png';

/**
 * Genera una imagen con marca de agua profesional que incluye:
 * - Logo UTPL
 * - Fecha y hora
 * - Radar de origen
 * - Leyenda de colores de intensidad
 */
export const generateWatermarkedImage = async (imageUrl, metadata) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Crear imagen principal
        const radarImg = new Image();
        radarImg.crossOrigin = 'anonymous';

        radarImg.onload = () => {
            // Dimensiones: imagen original + espacio para header y footer
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

            // ==================== HEADER ====================
            // Fondo azul UTPL
            ctx.fillStyle = '#1e3a5f';
            ctx.fillRect(0, 0, canvas.width, headerHeight);

            // Cargar y dibujar logo UTPL
            const logo = new Image();
            logo.src = logoUtpl;

            logo.onload = () => {
                // Logo en la esquina superior izquierda
                const logoHeight = 70;
                const logoWidth = (logo.width / logo.height) * logoHeight;
                ctx.drawImage(logo, 20, 15, logoWidth, logoHeight);

                // Información del radar (derecha del header)
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'right';
                ctx.fillText(`Radar: ${metadata.radar}`, imgWidth - 20, 40);

                // Fecha y hora
                ctx.font = '18px Arial';
                ctx.fillText(metadata.date, imgWidth - 20, 70);

                // ==================== IMAGEN DEL RADAR ====================
                ctx.drawImage(radarImg, 0, headerHeight, imgWidth, imgHeight);

                // ==================== FOOTER - LEYENDA DE COLORES ====================
                const footerY = headerHeight + imgHeight;

                // Fondo gris claro para footer
                ctx.fillStyle = '#f5f5f5';
                ctx.fillRect(0, footerY, canvas.width, footerHeight);

                // Título de leyenda
                ctx.fillStyle = '#1e3a5f';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'left';
                ctx.fillText('Intensidad de Precipitación (dBZ):', 20, footerY + 25);

                // Escala de colores (coincide con los colores reales del radar)
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

                    // Dibujar cuadro de color
                    ctx.fillStyle = item.color;
                    ctx.fillRect(x, startY, boxWidth, boxHeight);

                    // Borde negro
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, startY, boxWidth, boxHeight);

                    // Etiqueta dBZ
                    ctx.fillStyle = '#000000';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(item.label, x + boxWidth / 2, startY + boxHeight + 15);

                    // Descripción
                    ctx.font = 'bold 11px Arial';
                    ctx.fillText(item.description, x + boxWidth / 2, startY + boxHeight + 30);
                });

                // Información adicional en el footer
                ctx.fillStyle = '#666666';
                ctx.font = '11px Arial';
                ctx.textAlign = 'right';
                ctx.fillText('Universidad Técnica Particular de Loja', imgWidth - 20, footerY + footerHeight - 25);
                ctx.fillText('Sistema de Monitoreo Meteorológico', imgWidth - 20, footerY + footerHeight - 10);

                // Convertir canvas a blob
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            };

            logo.onerror = () => {
                // Si falla la carga del logo, continuar sin él
                console.warn('No se pudo cargar el logo UTPL');
                finishWithoutLogo();
            };
        };

        radarImg.onerror = () => {
            reject(new Error('Error al cargar la imagen del radar'));
        };

        radarImg.src = imageUrl;

        // Función alternativa si no se puede cargar el logo
        const finishWithoutLogo = () => {
            // Información del radar (sin logo)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('UTPL - Radar Meteorológico', 20, 45);

            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`Radar: ${metadata.radar}`, imgWidth - 20, 40);
            ctx.font = '18px Arial';
            ctx.fillText(metadata.date, imgWidth - 20, 70);

            // Dibujar imagen del radar
            ctx.drawImage(radarImg, 0, headerHeight, imgWidth, imgHeight);

            // Footer (igual que antes)
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

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png');
        };
    });
};

/**
 * Descarga una imagen con marca de agua
 */
export const downloadWatermarkedImage = async (imageUrl, filename, metadata) => {
    try {
        const blob = await generateWatermarkedImage(imageUrl, metadata);
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        console.error('Error al generar imagen con marca de agua:', error);
        throw error;
    }
};
