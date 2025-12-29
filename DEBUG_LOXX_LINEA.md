# 🔍 Debugging: Línea en el Radar LOXX

## 📊 Información de la Consola

Según la consola, los bounds están correctos:
```javascript
[[-5.076, -80.2858], [-2.916, -78.1258]]
```

Estos bounds son correctos para el radar LOXX (centro: -3.9960, -79.2058, radio: 120km).

---

## 🐛 Posibles Causas

### 1. **La Imagen no se Carga Correctamente**

**Verificar:**
1. Abre la URL de la imagen directamente en el navegador
2. Deberías ver la imagen PNG del radar
3. Si ves un error 404 o la imagen no carga, el problema está en la API

**En la consola del navegador, ejecuta:**
```javascript
// Ver la URL que se está usando
console.log('LOXX URL:', currentLoxxPng?.url);

// Intentar cargar la imagen manualmente
const img = new Image();
img.onload = () => console.log('LOXX: Imagen cargada OK');
img.onerror = (e) => console.error('LOXX: Error cargando imagen:', e);
img.src = currentLoxxPng?.url;
```

### 2. **Problema con los Bounds en Leaflet**

Leaflet ImageOverlay espera bounds en formato `[[south, west], [north, east]]`.

**Verificar en consola:**
```javascript
// Ver los bounds exactos
console.log('LOXX Bounds:', JSON.stringify(currentLoxxPng?.bounds));

// Deberían ser:
// [[-5.076, -80.2858], [-2.916, -78.1258]]
// Donde:
//   SW: [-5.076, -80.2858] (lat más al sur, lon más al oeste)
//   NE: [-2.916, -78.1258] (lat más al norte, lon más al este)
```

### 3. **La Imagen PNG tiene un Problema**

Si la imagen misma tiene una línea, el problema está en el procesamiento Python.

**Verificar:**
1. Abre la URL directamente: `http://localhost:5000/api/radar/pngs/[ID]/image`
2. Si la imagen tiene una línea vertical u horizontal, el problema está en el script Python
3. Revisa el script `generar_png_loxx.py` o `process_loxx_h5_compressed.py`

### 4. **Problema con el Metadata**

El metadata podría no incluir los bounds correctos.

**Verificar en PostgreSQL:**
```sql
SELECT 
    id,
    filename,
    metadata->>'bounds' as bounds_json,
    metadata->'bounds' as bounds_object
FROM radar_products
WHERE radar_id = 'LOXX'
  AND id = 42670;
```

---

## 🔧 Soluciones

### Solución 1: Verificar que la Imagen se Carga

En la consola del navegador:
```javascript
// Verificar URL
fetch(currentLoxxPng?.url)
  .then(r => {
    console.log('LOXX: Status:', r.status);
    console.log('LOXX: Content-Type:', r.headers.get('content-type'));
    return r.blob();
  })
  .then(blob => {
    console.log('LOXX: Tamaño imagen:', blob.size, 'bytes');
    const url = URL.createObjectURL(blob);
    console.log('LOXX: URL temporal:', url);
    // Abre esta URL en una nueva pestaña para ver la imagen
  })
  .catch(e => console.error('LOXX: Error:', e));
```

### Solución 2: Verificar Bounds Manualmente

Si los bounds están mal, puedes ajustarlos manualmente:

```javascript
// En la consola, ajustar bounds manualmente
// Centro: -3.9960, -79.2058
// Radio: 1.08 grados (120km)

const centerLat = -3.9960;
const centerLon = -79.2058;
const radius = 1.08;

const bounds = [
  [centerLat - radius, centerLon - radius],  // SW
  [centerLat + radius, centerLon + radius]   // NE
];

console.log('Bounds calculados:', bounds);
// Debería ser: [[-5.076, -80.2858], [-2.916, -78.1258]]
```

### Solución 3: Verificar el Script Python

El script Python debería generar bounds en el metadata. Verifica que:

1. El script `generar_png_loxx.py` incluya bounds en el metadata
2. Los bounds se guarden en PostgreSQL cuando se sube el PNG
3. El formato sea: `[[lat_min, lon_min], [lat_max, lon_max]]`

---

## 📝 Checklist de Verificación

- [ ] La URL de la imagen es correcta y accesible
- [ ] La imagen se carga cuando abres la URL directamente
- [ ] Los bounds están en el formato correcto: `[[SW], [NE]]`
- [ ] El metadata en PostgreSQL incluye los bounds
- [ ] La imagen PNG no tiene una línea (verificar abriendo la URL)
- [ ] No hay errores en la consola del navegador (CORS, 404, etc.)

---

## 🎯 Próximos Pasos

1. **Abre la URL de la imagen directamente** y verifica si se ve correctamente
2. **Revisa la consola** para ver si hay errores de carga
3. **Verifica el metadata en PostgreSQL** para ver si incluye bounds
4. **Comparte una captura de pantalla** de cómo se ve la "línea" para identificar mejor el problema

