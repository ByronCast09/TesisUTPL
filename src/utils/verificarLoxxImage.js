/**
 * Utilidad para verificar que la imagen de LOXX se carga correctamente
 * Usar en la consola del navegador para debugging
 */

export const verificarLoxxImage = async (imageUrl, bounds) => {
  console.log('='.repeat(60));
  console.log('VERIFICACIÓN DE IMAGEN LOXX');
  console.log('='.repeat(60));
  
  // 1. Verificar URL
  console.log('\n1. URL de la imagen:');
  console.log('   ', imageUrl);
  
  // 2. Verificar bounds
  console.log('\n2. Bounds:');
  console.log('   ', JSON.stringify(bounds, null, 2));
  
  if (bounds && Array.isArray(bounds) && bounds.length === 2) {
    const [sw, ne] = bounds;
    if (Array.isArray(sw) && Array.isArray(ne)) {
      const [latSW, lonSW] = sw;
      const [latNE, lonNE] = ne;
      console.log('   SW (Suroeste):', `[${latSW}, ${lonSW}]`);
      console.log('   NE (Noreste):', `[${latNE}, ${lonNE}]`);
      
      // Verificar que SW < NE
      if (latSW >= latNE || lonSW >= lonNE) {
        console.warn('   ⚠️  ADVERTENCIA: Bounds inválidos (SW >= NE)');
      } else {
        console.log('   ✅ Bounds válidos');
      }
    }
  }
  
  // 3. Intentar cargar la imagen
  console.log('\n3. Verificando carga de imagen...');
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers.get('content-type'));
    console.log('   Content-Length:', response.headers.get('content-length'), 'bytes');
    
    if (response.status === 200) {
      console.log('   ✅ Imagen accesible');
    } else {
      console.error('   ❌ Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('   ❌ Error al verificar:', error.message);
  }
  
  // 4. Crear imagen de prueba
  console.log('\n4. Creando imagen de prueba...');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  return new Promise((resolve) => {
    img.onload = () => {
      console.log('   ✅ Imagen cargada exitosamente');
      console.log('   Dimensiones:', img.width, 'x', img.height, 'píxeles');
      console.log('   URL temporal para ver imagen:', URL.createObjectURL(await fetch(imageUrl).then(r => r.blob())));
      resolve({ success: true, width: img.width, height: img.height });
    };
    
    img.onerror = (e) => {
      console.error('   ❌ Error al cargar imagen:', e);
      console.error('   Verifica:');
      console.error('     1. Que la URL sea correcta');
      console.error('     2. Que no haya problemas de CORS');
      console.error('     3. Que el servidor esté respondiendo');
      resolve({ success: false, error: e });
    };
    
    img.src = imageUrl;
  });
};

// Función para usar en la consola
window.verificarLoxxImage = verificarLoxxImage;

