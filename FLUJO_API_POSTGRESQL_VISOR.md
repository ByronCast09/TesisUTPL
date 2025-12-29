# 🔄 Flujo del Visor: API Local → PostgreSQL

## ✅ Estado Actual: **YA ESTÁ IMPLEMENTADO**

El visor **ya está configurado** para usar la API local que consulta PostgreSQL directamente, **NO** consulta el servidor remoto.

---

## 🔄 Flujo Completo

### 1. **PC Remota** (Procesamiento)
```
Archivo H5 → Procesa → PNG → Servidor HTTP (puerto 8080)
```

### 2. **PC Local** (Sincronización Automática)
```
Servicio sincroniza cada 5 minutos
    ↓
Consulta: http://100.100.81.47:8080/api/radar/index
    ↓
Descarga PNGs nuevos
    ↓
Guarda en PostgreSQL (columna png_data)
```

### 3. **Visor** (Consulta API Local)
```
Visor carga
    ↓
Consulta: http://localhost:5000/api/radar/LOXX/pngs/viewer-index
    ↓
API consulta PostgreSQL directamente
    ↓
Devuelve índice con URLs locales: /api/radar/pngs/{id}/image
    ↓
Visor muestra imágenes desde PostgreSQL
```

---

## 📡 Endpoints de la API Local

### 1. **Obtener Índice de PNGs** (Para el Visor)
```
GET /api/radar/:radarId/pngs/viewer-index
```

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/LOXX/pngs/viewer-index
```

**Respuesta:**
```json
{
  "success": true,
  "radar": "LOXX",
  "source": "postgresql",
  "index": [
    {
      "date": "2025-07-18",
      "png": [
        {
          "name": "LOXX_20250718_160000.png",
          "filename": "LOXX_20250718_160000.png",
          "url": "http://localhost:5000/api/radar/pngs/123/image",
          "id": 123,
          "timestamp": "2025-07-18T16:00:00Z",
          "hasImage": true
        }
      ]
    }
  ]
}
```

### 2. **Obtener Imagen PNG** (Desde PostgreSQL)
```
GET /api/radar/pngs/:id/image
```

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/pngs/123/image
```

**Respuesta:**
- Content-Type: `image/png`
- Body: Buffer de la imagen PNG
- Headers: CORS habilitado, Cache-Control configurado

### 3. **Última Imagen del Día**
```
GET /api/radar/:radarId/pngs/latest-today?date=2025-07-18
```

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/LOXX/pngs/latest-today?date=2025-07-18
```

**Respuesta:**
```json
{
  "success": true,
  "image": {
    "id": 123,
    "filename": "LOXX_20250718_160000.png",
    "url": "http://localhost:5000/api/radar/pngs/123/image",
    "timestamp": "2025-07-18T16:00:00Z",
    "metadata": { ... }
  }
}
```

---

## 🔍 Cómo Funciona en el Código

### Frontend (`Visor.jsx`)

```javascript
// 1. Cargar índice desde PostgreSQL
const response = await getPngIndexFromDbForViewer(radarId);
// Esto llama a: GET /api/radar/LOXX/pngs/viewer-index

// 2. El índice devuelve URLs locales
const url = file?.url; // Ejemplo: /api/radar/pngs/123/image

// 3. El visor usa estas URLs directamente
setCurrentRadarPng({
  url, // URL local, NO remota
  source: 'postgresql'
});
```

### Backend (`radarController.js`)

```javascript
// Endpoint: GET /api/radar/:radarId/pngs/viewer-index
exports.getPngIndexForViewer = async (req, res) => {
  // 1. Consulta PostgreSQL directamente
  const pngs = await radarMetadataRepository.listProcessed({
    radarId,
    productType: 'ppi_png',
    from: new Date(`${date}T00:00:00Z`),
    to: new Date(`${date}T23:59:59Z`)
  });
  
  // 2. Construye URLs locales
  const pngList = pngs.map(png => ({
    url: `${baseUrl}/api/radar/pngs/${png.id}/image`, // URL LOCAL
    id: png.id,
    filename: png.filename
  }));
  
  // 3. Devuelve índice con URLs locales
  return res.json({
    success: true,
    source: 'postgresql',
    index: [{ date, png: pngList }]
  });
};

// Endpoint: GET /api/radar/pngs/:id/image
exports.getPngImageFromDb = async (req, res) => {
  // 1. Obtiene imagen desde PostgreSQL
  const imageBuffer = await radarMetadataRepository.getImageBufferById(id);
  
  // 2. Sirve la imagen directamente
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.send(imageBuffer);
};
```

---

## ✅ Verificación

### 1. Verificar que PostgreSQL tiene imágenes

```sql
SELECT 
    id, 
    filename, 
    radar_id, 
    source_timestamp,
    CASE 
        WHEN png_data IS NOT NULL THEN 'Sí'
        ELSE 'No'
    END as tiene_imagen
FROM radar_products 
WHERE radar_id = 'LOXX' 
  AND product_type = 'ppi_png'
ORDER BY source_timestamp DESC 
LIMIT 10;
```

### 2. Verificar que la API local funciona

```bash
# Probar índice
curl http://localhost:5000/api/radar/LOXX/pngs/viewer-index

# Probar imagen (reemplaza 123 con un ID real)
curl http://localhost:5000/api/radar/pngs/123/image -o test.png
```

### 3. Verificar en el navegador

1. Abre el visor
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña "Network"
4. Activa LOXX
5. **Verifica:** Las peticiones deben ser a `localhost:5000/api/radar/...`
6. **NO debe haber** peticiones a `100.100.81.47:8080`

---

## ⚠️ Notas Importantes

### 1. **Sincronización Automática**
- El servicio `PNGSyncService` sincroniza automáticamente cada 5 minutos
- Descarga PNGs desde la PC remota y los guarda en PostgreSQL
- **No necesitas hacer nada manual**

### 2. **URLs Locales vs Remotas**
- **Antes:** El visor consultaba `http://100.100.81.47:8080/...` (lento, intermitente)
- **Ahora:** El visor consulta `http://localhost:5000/api/radar/...` (rápido, confiable)

### 3. **Fallback a Proxy Remoto**
- Si una imagen NO está en PostgreSQL, el visor intenta usar el proxy remoto como fallback
- Esto solo ocurre si la sincronización no ha descargado esa imagen aún

### 4. **Caché del Navegador**
- Las imágenes tienen `Cache-Control: public, max-age=3600` (1 hora)
- El navegador cachea las imágenes para mejor rendimiento

---

## 🎯 Resumen

✅ **El visor YA usa PostgreSQL** a través de la API local  
✅ **NO consulta directamente** el servidor remoto  
✅ **Las imágenes se sirven** desde PostgreSQL localmente  
✅ **Sincronización automática** cada 5 minutos  

**Flujo:**
```
PC Remota → Servidor HTTP → PC Local (Sincronización) → PostgreSQL → API Local → Visor
```

**El visor NUNCA consulta directamente a la PC remota.**


