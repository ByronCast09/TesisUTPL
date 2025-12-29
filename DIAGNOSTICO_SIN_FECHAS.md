# 🔍 Diagnóstico: "Sin fechas" y "Sin imágenes" en el Visor

## ✅ Confirmación

**SÍ, el visor está consumiendo PostgreSQL** (usa `getPngIndexFromDbForViewer`), pero no muestra datos.

---

## 🔍 Pasos de Diagnóstico

### Paso 1: Verificar que el Backend Devuelve Datos

Abre en el navegador:
```
http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

**Deberías ver un JSON** como:
```json
{
  "success": true,
  "radar": "LGUAXX",
  "source": "postgresql",
  "index": [
    {
      "date": "2025-11-28",
      "png": [
        {
          "name": "LGUAXX_20251128_220002.png",
          "url": "http://localhost:5000/api/radar/pngs/123/image",
          ...
        }
      ]
    }
  ]
}
```

**Si ves `"index": []` o no hay fechas:**
- No hay datos en PostgreSQL, O
- Los PNGs no tienen imagen (`png_data` es NULL)

---

### Paso 2: Verificar Datos en PostgreSQL

Conecta a PostgreSQL y verifica:

```sql
-- Ver cuántos PNGs hay
SELECT COUNT(*) as total_pngs FROM radar_products 
WHERE product_type = 'ppi_png' AND radar_id = 'LGUAXX';

-- Ver PNGs con imagen
SELECT COUNT(*) as pngs_con_imagen FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX' 
  AND png_data IS NOT NULL;

-- Ver PNGs sin imagen
SELECT COUNT(*) as pngs_sin_imagen FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX' 
  AND png_data IS NULL;

-- Ver fechas disponibles (solo PNGs con imagen)
SELECT DISTINCT DATE(source_timestamp) as fecha
FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX'
  AND png_data IS NOT NULL
ORDER BY fecha DESC;
```

**Si `pngs_con_imagen = 0`:**
- Los PNGs no se subieron con sus datos de imagen
- Necesitas ejecutar el conversor con `--db-url`

---

### Paso 3: Verificar Consola del Navegador

1. Abre el visor
2. Presiona `F12` (herramientas de desarrollador)
3. Ve a la pestaña **Console**
4. Busca errores o mensajes

**Busca específicamente:**
- `Error cargando fechas remotas: ...`
- `Respuesta inválida del índice de PostgreSQL`
- `No se pudo conectar con PostgreSQL`

---

### Paso 4: Verificar Pestaña Network

1. En F12, ve a la pestaña **Network**
2. Recarga la página (F5)
3. Busca la petición a `/api/radar/LGUAXX/pngs/viewer-index`

**Verifica:**
- ¿Se está haciendo la petición?
- ¿Qué código de respuesta tiene? (200 = OK, 404/500 = Error)
- ¿Qué devuelve? (haz clic en la petición y ve a "Response")

---

## ✅ Soluciones

### Problema 1: No hay PNGs con Imagen en PostgreSQL

**Solución:** Sube los PNGs con sus datos de imagen:

```powershell
python advanced_ppi_converter.py `
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" `
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" `
    --radar-id LGUAXX `
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

**Importante:** El conversor debe subir los PNGs con `png_data` (los datos de la imagen), no solo los metadatos.

---

### Problema 2: El Backend No Devuelve Datos

**Verificar en el backend:**

1. **Verifica que el backend está corriendo:**
   ```bash
   curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
   ```

2. **Verifica logs del backend:**
   - Deberías ver las peticiones en la consola donde corre el backend
   - Busca errores de conexión a PostgreSQL

3. **Verifica variables de entorno:**
   - Archivo: `tesis_utpl/backend/.env`
   - Debe tener: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

### Problema 3: El Controlador Fue Modificado Incorrectamente

**Verificar que el controlador funciona:**

Después de mi modificación, el controlador solo devuelve PNGs con imagen. Verifica que:

1. **El backend fue reiniciado** después de la modificación
2. **La API devuelve datos:**
   ```bash
   curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index | jq '.index | length'
   ```
   Debería ser > 0 si hay datos

---

## 🧪 Prueba Rápida en la Consola del Navegador

Abre la consola (F12) y ejecuta:

```javascript
// Probar conexión directa a la API
fetch('http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Respuesta:', data);
    console.log('Total fechas:', data.index?.length || 0);
    if (data.index && data.index.length > 0) {
      console.log('Primera fecha:', data.index[0].date);
      console.log('PNGs en primera fecha:', data.index[0].png?.length || 0);
    } else {
      console.log('❌ No hay fechas en el índice');
    }
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
```

**Interpretación:**
- Si `Total fechas: 0` → No hay datos en PostgreSQL
- Si hay fechas pero `PNGs: 0` → Los PNGs no tienen imagen
- Si hay error → Problema de conexión o backend

---

## 📋 Checklist de Verificación

- [ ] Backend está corriendo en puerto 5000
- [ ] PostgreSQL está corriendo
- [ ] Hay PNGs en PostgreSQL: `SELECT COUNT(*) FROM radar_products WHERE product_type = 'ppi_png'`
- [ ] Los PNGs tienen imagen: `SELECT COUNT(*) FROM radar_products WHERE png_data IS NOT NULL`
- [ ] La API devuelve datos: `curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index`
- [ ] No hay errores en la consola del navegador
- [ ] El toggle "Remoto" está activado (verde)
- [ ] Las peticiones en Network tienen código 200

---

## 🔧 Solución Rápida

### Si no hay datos en PostgreSQL:

1. **Ejecuta el conversor** para subir datos:
   ```powershell
   python advanced_ppi_converter.py `
       --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" `
       --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" `
       --radar-id LGUAXX `
       --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
   ```

2. **Verifica que se subieron:**
   ```sql
   SELECT COUNT(*) FROM radar_products 
   WHERE product_type = 'ppi_png' 
     AND radar_id = 'LGUAXX' 
     AND png_data IS NOT NULL;
   ```

3. **Recarga el visor** (Ctrl+Shift+R)

---

*Última actualización: Diagnóstico de "Sin fechas" en el visor*


