# ⚡ Pasos Rápidos - LOXX en PC Local

## ✅ Ya tienes:
- ✅ PC remota convirtiendo H5 → PNG
- ✅ Servidor HTTP en PC remota (puerto 8080)
- ✅ `.env` actualizado con `RADAR_LOXX_URL=http://100.100.81.47:8080`

## 🎯 Lo que falta hacer (3 pasos):

### 1️⃣ Verificar/Actualizar `.env`

Abre `tesis_utpl/backend/.env` y asegúrate de tener:

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=radar_metadata

# IMPORTANTE: Estos dos deben estar en 'true'
STORE_PNG_IN_DB=true
ENABLE_PNG_SYNC=true

# URL del radar LOXX
RADAR_LOXX_URL=http://100.100.81.47:8080
```

### 2️⃣ Iniciar el Servidor Backend

```bash
cd tesis_utpl/backend
npm start
```

**Deberías ver:**
```
[auto-services] ✓ Sincronización PNG iniciada para LOXX (cada 300s)
[png-sync] Servicio iniciado. Sincronizando cada 300 segundos
```

### 3️⃣ (Opcional) Forzar Descarga Inmediata

Si no quieres esperar 5 minutos, ejecuta:

```bash
curl -X POST "http://localhost:5000/api/radar/LOXX/download-pngs/recent?days=7"
```

---

## 📡 Usar la API en tu Visor

### Obtener índice de PNGs:

```javascript
fetch('http://localhost:5000/api/radar/LOXX/pngs/viewer-index')
  .then(res => res.json())
  .then(data => {
    // data.index contiene las fechas y PNGs
    console.log(data);
  });
```

### Obtener una imagen:

```javascript
// El ID viene del viewer-index
const imageUrl = `http://localhost:5000/api/radar/pngs/${pngId}/image`;
```

---

## ✅ Verificar que Funciona

```bash
# 1. Ver PNGs en PostgreSQL
curl http://localhost:5000/api/radar/LOXX/pngs?limit=5

# 2. Ver índice para el visor
curl http://localhost:5000/api/radar/LOXX/pngs/viewer-index
```

---

## 📚 Documentación Completa

Para más detalles, consulta:
- `backend/CONFIGURACION_LOXX_PC_LOCAL.md` - Guía completa paso a paso

---

## 🎉 ¡Listo!

El sistema ahora:
1. ✅ Descarga PNGs automáticamente cada 5 minutos
2. ✅ Los sube a PostgreSQL automáticamente
3. ✅ Tu visor puede leerlos desde PostgreSQL vía API

