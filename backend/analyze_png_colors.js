const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

async function analyzePngColors() {
    const pngPath = path.join(__dirname, 'png_debug', 'from_database.png');

    if (!fs.existsSync(pngPath)) {
        console.log('❌ No se encontró el archivo PNG en png_debug/from_database.png');
        console.log('   Por favor ejecuta primero: node check_png_issue.js');
        return;
    }

    console.log('🔍 Analizando colores del PNG...\n');

    const data = fs.readFileSync(pngPath);
    const png = PNG.sync.read(data);

    console.log(`📐 Dimensiones: ${png.width}x${png.height}`);
    console.log(`🎨 Modo de color: ${png.colorType === 6 ? 'RGBA (con transparencia)' : png.colorType === 2 ? 'RGB' : 'Otro'}`);
    console.log(`📊 Profundidad: ${png.depth} bits\n`);

    // Analizar colores únicos
    const colorCounts = new Map();
    const magentaPixels = [];
    let transparentPixels = 0;
    let totalPixels = png.width * png.height;

    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) << 2;
            const r = png.data[idx];
            const g = png.data[idx + 1];
            const b = png.data[idx + 2];
            const a = png.data[idx + 3];

            // Contar transparentes
            if (a === 0) {
                transparentPixels++;
            }

            // Detectar magenta (R alto, G bajo, B alto)
            const isMagenta = (r > 200 && g < 100 && b > 200);
            if (isMagenta) {
                magentaPixels.push({ x, y, r, g, b, a });
            }

            // Agrupar colores similares
            const colorKey = `${Math.floor(r / 10) * 10},${Math.floor(g / 10) * 10},${Math.floor(b / 10) * 10},${a > 0 ? 'opaque' : 'transparent'}`;
            colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
        }
    }

    console.log('📊 Estadísticas:');
    console.log(`   Total de píxeles: ${totalPixels}`);
    console.log(`   Píxeles transparentes (alpha=0): ${transparentPixels} (${(transparentPixels / totalPixels * 100).toFixed(2)}%)`);
    console.log(`   Píxeles magenta detectados: ${magentaPixels.length} (${(magentaPixels.length / totalPixels * 100).toFixed(2)}%)\n`);

    if (magentaPixels.length > 0) {
        console.log('🟣 MAGENTA DETECTADO:');
        console.log('   Primeros 5 píxeles magenta:');
        magentaPixels.slice(0, 5).forEach((p, i) => {
            console.log(`   ${i + 1}. Posición (${p.x}, ${p.y}): RGB(${p.r}, ${p.g}, ${p.b}) Alpha=${p.a}`);
        });
        console.log('');
    } else {
        console.log('✅ NO se detectó color magenta en la imagen\n');
    }

    // Mostrar los 10 colores más comunes
    const sortedColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    console.log('🎨 Top 10 colores más comunes:');
    sortedColors.forEach(([color, count], i) => {
        const percentage = (count / totalPixels * 100).toFixed(2);
        console.log(`   ${i + 1}. ${color}: ${count} píxeles (${percentage}%)`);
    });

    console.log('\n💡 Interpretación:');
    if (magentaPixels.length > 0) {
        console.log('   ❌ La imagen TIENE píxeles magenta - esto es el problema');
        console.log('   📝 Los PNGs de la PC remota se están generando con fondo magenta');
    } else {
        console.log('   ✅ La imagen NO tiene píxeles magenta');
        if (transparentPixels > totalPixels * 0.1) {
            console.log('   ✅ La imagen tiene fondo transparente adecuado');
        }
        console.log('   💭 El problema debe estar en cómo el navegador renderiza la imagen');
    }
}

analyzePngColors().catch(err => {
    console.error('Error:', err.message);
    console.error(err.stack);
});
