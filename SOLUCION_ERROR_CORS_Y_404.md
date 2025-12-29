# 🔧 Solución: Error CORS y 404 en el Visor

## ❌ Problemas Identificados

1. **Error CORS**: El visor intenta acceder a `http://100.88.71.120:8080` sin headers CORS
2. **Error 404**: Los archivos no se encuentran en el servidor remoto
3. **Problema raíz**: El visor está usando URLs del servidor remoto en lugar de PostgreSQL local

---

## 🔍 Diagnóstico

El visor está intentando cargar imágenes desde:
```
http://100.88.71.120:8080/2025-11-28/LGUAXX_20251128_220002.png
```

Pero debería usar:
```
http://localhost:5000/api/radar/pngs/123/image
```

---

## ✅ Solución 1: Verificar que PostgreSQL Devuelve URLs Correctas

El problema está en que PostgreSQL está devolviendo URLs del servidor remoto en lugar de URLs del backend local.

### Verificar en el Backend:

Abre en el navegador:
```
http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

**Revisa las URLs en el JSON**. Deberían ser:
```json
{
  "url": "http://localhost:5000/api/radar/pngs/123/image"
}
```

**NO deberían ser:**
```json
{
  "url": "http://100.88.71.120:8080/2025-11-28/archivo.png"
}
```

---

## ✅ Solución 2: Corregir URLs en el Controlador

El problema está en `radarController.js` en la función `getPngIndexForViewer`. Está construyendo URLs remotas para PNGs que no tienen imagen en PostgreSQL.

### Opción A: Usar solo PNGs con imagen en PostgreSQL

Modifica el controlador para que **solo devuelva PNGs que tienen `png_data` en PostgreSQL**:

```javascript
// En radarController.js, función getPngIndexForViewer
// Solo incluir PNGs con imagen
const pngList = pngsConImagen.map(png => ({
  name: png.filename,
  file: png.filename,
  filename: png.filename,
  url: `${baseUrl}/api/radar/pngs/${png.id}/image`,  // ← URL del backend local
  id: png.id,
  timestamp: png.source_timestamp ? new Date(png.source_timestamp).toISOString() : null,
  size: png.file_size,
  metadata: png.metadata || {},
  hasImage: true,
}));

// NO incluir PNGs sin imagen (pngsSinImagen) que usan URLs remotas
```

### Opción B: Si necesitas URLs remotas, agregar CORS al radar_server.py

Si realmente necesitas usar el servidor remoto, agrega CORS a `radar_server.py`:

```python
# En radar_server.py, clase RadarHTTPHandler
def end_headers(self):
    self.send_header('Access-Control-Allow-Origin', '*')  # ← Agregar esto
    self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    super().end_headers()

def do_OPTIONS(self):
    """Manejar preflight requests"""
    self.send_response(200)
    self.end_headers()
```

---

## ✅ Solución 3: Asegurar que los PNGs se Suben a PostgreSQL

El problema puede ser que los PNGs no se están subiendo correctamente a PostgreSQL.

### Verificar en PostgreSQL:

```sql
-- Ver PNGs con imagen
SELECT id, filename, 
       CASE WHEN png_data IS NOT NULL THEN 'Tiene imagen' ELSE 'Sin imagen' END as estado
FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX'
ORDER BY created_at DESC 
LIMIT 10;
```

**Si todos dicen "Sin imagen":**
- Los PNGs no se están subiendo con los datos de imagen
- Necesitas ejecutar el conversor con `--db-url` para subir las imágenes

---

## ✅ Solución 4: Usar Solo PostgreSQL (Recomendado)

La mejor solución es usar **solo PostgreSQL** y no el servidor remoto.

### Modificar el Controlador:

En `tesis_utpl/backend/controllers/radarController.js`, función `getPngIndexForViewer`:

```javascript
// NO incluir PNGs sin imagen que usan URLs remotas
// Solo incluir PNGs con imagen en PostgreSQL
if (pngsConImagen.length > 0) {
  const pngList = pngsConImagen.map(png => ({
    name: png.filename,
    file: png.filename,
    filename: png.filename,
    url: `${baseUrl}/api/radar/pngs/${png.id}/image`,  // ← Siempre URL local
    id: png.id,
    timestamp: png.source_timestamp ? new Date(png.source_timestamp).toISOString() : null,
    size: png.file_size,
    metadata: png.metadata || {},
    hasImage: true,
  }));
  
  // NO agregar pngsSinImagen aquí
  // ...
}
```

---

## 🚀 Solución Rápida: Subir PNGs a PostgreSQL

Si los PNGs no tienen imagen en PostgreSQL, súbelos:

### Opción 1: Usar el conversor con PostgreSQL

```powershell
python advanced_ppi_converter.py `
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" `
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" `
    --radar-id LGUAXX `
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

### Opción 2: Usar script de sincronización

Si ya tienes PNGs convertidos pero no subidos:

```bash
cd tesis_utpl/backend
node scripts/resincronizar_pngs_con_imagenes.js LGUAXX
```

---

## 🔍 Verificar que Funciona

### 1. Verificar API devuelve URLs correctas:

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index | jq '.index[0].png[0].url'
```

Debería mostrar:
```
"http://localhost:5000/api/radar/pngs/123/image"
```

**NO debería mostrar:**
```
"http://100.88.71.120:8080/..."
```

### 2. Verificar que las imágenes se cargan:

Abre en el navegador:
```
http://localhost:5000/api/radar/pngs/123/image
```

Debería mostrar la imagen PNG (no 404).

---

## 📋 Checklist de Solución

- [ ] Verificar que PostgreSQL tiene PNGs con `png_data` (no NULL)
- [ ] Verificar que la API devuelve URLs de `localhost:5000` (no `100.88.71.120:8080`)
- [ ] Si no hay PNGs con imagen, ejecutar conversor con `--db-url`
- [ ] Modificar controlador para NO incluir URLs remotas
- [ ] Reiniciar backend después de cambios
- [ ] Limpiar caché del navegador (Ctrl+Shift+R)

---

## 🆘 Si Aún No Funciona

### Verificar en la Consola del Navegador:

```javascript
// Ver qué URLs está recibiendo el visor
fetch('http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index')
  .then(r => r.json())
  .then(data => {
    console.log('Primera imagen:', data.index[0]?.png[0]);
    console.log('URL:', data.index[0]?.png[0]?.url);
  });
```

**Si la URL es `100.88.71.120:8080`:**
- El controlador está generando URLs remotas
- Necesitas modificar el controlador para usar solo URLs locales

**Si la URL es `localhost:5000`:**
- El problema puede ser que la imagen no existe en PostgreSQL
- Verifica que `png_data` no es NULL

---

*Última actualización: Solución para errores CORS y 404*


