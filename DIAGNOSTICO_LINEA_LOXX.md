# 🔍 Diagnóstico: Línea en el Radar LOXX

## ✅ Bounds Correctos

Según la consola, los bounds están correctos:
```javascript
[[-5.076, -80.2858], [-2.916, -78.1258]]
```

Estos bounds son correctos para el radar LOXX.

---

## 🔍 Pasos de Diagnóstico

### Paso 1: Verificar que la Imagen se Carga

En la consola del navegador (F12), ejecuta:

```javascript
// Ver la URL actual
console.log('URL:', currentLoxxPng?.url);

// Intentar cargar la imagen
fetch(currentLoxxPng?.url)
  .then(r => {
    console.log('Status:', r.status);
    console.log('Content-Type:', r.headers.get('content-type'));
    if (r.status === 200) {
      return r.blob();
    } else {
      throw new Error(`Status ${r.status}`);
    }
  })
  .then(blob => {
    console.log('✅ Imagen cargada, tamaño:', blob.size, 'bytes');
    const url = URL.createObjectURL(blob);
    console.log('Abre esta URL en una nueva pestaña:', url);
    // window.open(url); // Descomenta para abrir automáticamente
  })
  .catch(e => console.error('❌ Error:', e));
```

**Si hay error 404:**
- La imagen no existe en PostgreSQL
- Verifica que el PNG se haya subido correctamente

**Si hay error CORS:**
- Verifica que el servidor backend permita CORS
- Verifica que la URL sea correcta

### Paso 2: Ver la Imagen Directamente

1. Copia la URL de la consola
2. Ábrela en una nueva pestaña del navegador
3. Verifica:
   - ¿Se ve la imagen correctamente?
   - ¿Tiene una línea?
   - ¿Es transparente?

**Si la imagen tiene una línea:**
- El problema está en el procesamiento Python
- Revisa el script `generar_png_loxx.py` o `process_loxx_h5_compressed.py`

**Si la imagen se ve bien:**
- El problema está en cómo se renderiza en el mapa
- Podría ser un problema con los bounds o con ImageOverlay

### Paso 3: Verificar Bounds en PostgreSQL

```sql
SELECT 
    id,
    filename,
    metadata->>'bounds' as bounds_json
FROM radar_products
WHERE radar_id = 'LOXX'
  AND id = 42670;
```

**Si los bounds están en el metadata:**
- Deberían usarse automáticamente
- Verifica el formato: `[[lat_min, lon_min], [lat_max, lon_max]]`

**Si no hay bounds en el metadata:**
- El script Python debería generarlos
- O se usarán los bounds por defecto configurados

### Paso 4: Verificar el Formato de Bounds

En la consola:

```javascript
const bounds = currentLoxxPng?.bounds;
console.log('Bounds:', bounds);
console.log('Tipo:', Array.isArray(bounds));
console.log('Longitud:', bounds?.length);

if (bounds && bounds.length === 2) {
  const [sw, ne] = bounds;
  console.log('SW:', sw, 'Tipo:', Array.isArray(sw));
  console.log('NE:', ne, 'Tipo:', Array.isArray(ne));
  
  if (Array.isArray(sw) && Array.isArray(ne)) {
    const [latSW, lonSW] = sw;
    const [latNE, lonNE] = ne;
    console.log('SW:', latSW, lonSW);
    console.log('NE:', latNE, lonNE);
    console.log('SW < NE?', latSW < latNE && lonSW < lonNE);
  }
}
```

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: La Imagen no se Carga (404)

**Causa:** El PNG no está en PostgreSQL o la URL es incorrecta

**Solución:**
1. Verifica que el PNG esté en PostgreSQL:
   ```sql
   SELECT id, filename FROM radar_products WHERE radar_id = 'LOXX' LIMIT 5;
   ```

2. Verifica que la URL sea correcta:
   ```javascript
   // Debería ser: http://localhost:5000/api/radar/pngs/[ID]/image
   console.log(currentLoxxPng?.url);
   ```

### Problema 2: La Imagen se Ve como una Línea

**Causa:** Los bounds están mal o la imagen se está estirando incorrectamente

**Solución:**
1. Verifica los bounds en la consola
2. Asegúrate de que sean: `[[lat_min, lon_min], [lat_max, lon_max]]`
3. Verifica que `lat_min < lat_max` y `lon_min < lon_max`

### Problema 3: La Imagen PNG Tiene una Línea

**Causa:** El procesamiento Python tiene un problema

**Solución:**
1. Abre la imagen directamente en el navegador
2. Si la imagen tiene una línea, revisa:
   - El script `generar_png_loxx.py`
   - La función `visualize_dbzh_transparent()`
   - Los bounds calculados en `calculate_bounds_from_metadata()`

---

## 🔧 Verificación Rápida

Ejecuta esto en la consola del navegador:

```javascript
// Verificar estado completo de LOXX
console.log('=== ESTADO LOXX ===');
console.log('Toggle:', loxxToggle);
console.log('Current PNG:', currentLoxxPng);
console.log('URL:', currentLoxxPng?.url);
console.log('Bounds:', currentLoxxPng?.bounds);
console.log('Filename:', currentLoxxPng?.filename);
console.log('ID:', currentLoxxPng?.id);

// Verificar que la URL sea accesible
if (currentLoxxPng?.url) {
  fetch(currentLoxxPng.url, { method: 'HEAD' })
    .then(r => console.log('URL Status:', r.status))
    .catch(e => console.error('URL Error:', e));
}
```

---

## 📝 Información para Compartir

Si el problema persiste, comparte:

1. **La URL de la imagen** (de la consola)
2. **Los bounds** (de la consola)
3. **Una captura de pantalla** de cómo se ve la "línea"
4. **El resultado de abrir la URL directamente** en el navegador
5. **Cualquier error en la consola** del navegador

Con esta información podré identificar exactamente dónde está el problema.

