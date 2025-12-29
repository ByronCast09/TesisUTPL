# 🚀 Configuración LOXX en PC Local - Guía Completa

Esta guía te muestra **exactamente** qué hacer para recibir las imágenes PNG de LOXX, subirlas a PostgreSQL y consumirlas desde tu visor.

---

## 📋 Paso 1: Configurar el archivo `.env`

Edita el archivo `tesis_utpl/backend/.env` y asegúrate de tener estas variables:

```env
# ============================================
# CONFIGURACIÓN DE POSTGRESQL LOCAL
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres
DB_NAME=radar_metadata

# ============================================
# ALMACENAMIENTO DE PNGs EN BASE DE DATOS
# ============================================
# IMPORTANTE: Debe estar en 'true' para guardar los PNGs
STORE_PNG_IN_DB=true

# ============================================
# SINCRONIZACIÓN AUTOMÁTICA
# ============================================
# Activar descarga automática de PNGs desde PC remota
ENABLE_PNG_SYNC=true

# Intervalo de sincronización (opcional, por defecto 5 minutos)
PNG_SYNC_INTERVAL=300000

# ============================================
# URLs DE RADARES REMOTOS
# ============================================
# Radar LOXX (PC remota vía Tailscale)
RADAR_LOXX_URL=http://100.100.81.47:8080

# Radar LGUAXX (si lo tienes)
RADAR_LGUAXX_URL=http://[IP_LGUAXX]:8080
```

**⚠️ IMPORTANTE:**
- `STORE_PNG_IN_DB=true` → **OBLIGATORIO** para guardar PNGs en PostgreSQL
- `ENABLE_PNG_SYNC=true` → **OBLIGATORIO** para descarga automática
- `RADAR_LOXX_URL` → Debe apuntar a tu PC remota con Tailscale

---

## 🔍 Paso 2: Verificar que la PC Remota esté Accesible

Antes de iniciar el servidor, verifica que puedas acceder a la PC remota:

```bash
# Desde tu PC local, prueba:
curl http://100.100.81.47:8080/api/radar/index
```

Deberías ver un JSON con la lista de PNGs disponibles. Si no funciona:
- Verifica que Tailscale esté conectado en ambas PCs
- Verifica que el servidor esté corriendo en la PC remota
- Verifica el firewall de Windows

---

## 🚀 Paso 3: Iniciar el Servidor Backend

En tu **PC LOCAL**, ejecuta:

```bash
cd tesis_utpl/backend
npm start
```

Deberías ver en los logs:

```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[auto-services] ✓ Sincronización PNG iniciada para LOXX (cada 300s)
[png-sync] Iniciando servicio de sincronización para LOXX
[png-sync] Intervalo: 300 segundos
[png-sync] Servicio iniciado. Sincronizando cada 300 segundos
```

**Si NO ves estos mensajes:**
- Verifica que `ENABLE_PNG_SYNC=true` esté en `.env`
- Reinicia el servidor después de cambiar `.env`

---

## ⏱️ Paso 4: Esperar o Forzar Sincronización

### Opción A: Esperar (Automático)

El servidor descargará PNGs automáticamente cada 5 minutos. Verás logs como:

```
[png-sync] Iniciando sincronización para LOXX...
[png-sync] Descargando PNG: LOXX_20251206_193000.png (2025-12-06)
[png-sync] ✓ PNG sincronizado: LOXX_20251206_193000.png (ID: 123)
[png-sync] Sincronización completada en 12.5s
[png-sync] Total: 5, Descargados: 3, Omitidos: 2, Errores: 0
```

### Opción B: Forzar Sincronización Inmediata

Si quieres descargar PNGs **ahora mismo** sin esperar:

```bash
# Descargar PNGs de los últimos 7 días
curl -X POST "http://localhost:5000/api/radar/LOXX/download-pngs/recent?days=7"

# O descargar TODOS los PNGs nuevos
curl -X POST "http://localhost:5000/api/radar/LOXX/download-pngs"
```

---

## ✅ Paso 5: Verificar que los PNGs estén en PostgreSQL

### Opción 1: Consulta SQL

```sql
SELECT 
    id, 
    filename, 
    source_timestamp, 
    file_size,
    radar_id
FROM radar_products 
WHERE radar_id = 'LOXX' 
ORDER BY source_timestamp DESC 
LIMIT 10;
```

Deberías ver los PNGs que se descargaron.

### Opción 2: Usar la API

```bash
# Listar PNGs de LOXX
curl http://localhost:5000/api/radar/LOXX/pngs?limit=10
```

---

## 📡 Paso 6: Consumir la API desde tu Visor

Tu visor puede consumir los datos desde PostgreSQL usando estas APIs:

### 1. Obtener índice de PNGs (para el visor)

```javascript
// GET /api/radar/LOXX/pngs/viewer-index
fetch('http://localhost:5000/api/radar/LOXX/pngs/viewer-index')
  .then(res => res.json())
  .then(data => {
    console.log(data);
    // Estructura:
    // {
    //   success: true,
    //   radar: "LOXX",
    //   index: [
    //     {
    //       date: "2025-12-06",
    //       png: [
    //         {
    //           filename: "LOXX_20251206_193000.png",
    //           url: "/api/radar/pngs/123/image",
    //           timestamp: "2025-12-06T19:30:00Z"
    //         }
    //       ]
    //     }
    //   ]
    // }
  });
```

### 2. Obtener una imagen específica

```javascript
// GET /api/radar/pngs/:id/image
// El ID viene del viewer-index
const imageUrl = `http://localhost:5000/api/radar/pngs/${pngId}/image`;
```

### 3. Obtener PNGs por fecha

```javascript
// GET /api/radar/LOXX/pngs?date=2025-12-06
fetch('http://localhost:5000/api/radar/LOXX/pngs?date=2025-12-06')
  .then(res => res.json())
  .then(data => {
    console.log(data);
  });
```

---

## 📊 Endpoints de API Disponibles

### Para Descargar PNGs (Manual):

- **POST** `/api/radar/LOXX/download-pngs` - Descargar todos los PNGs nuevos
- **POST** `/api/radar/LOXX/download-pngs/recent?days=7` - Descargar PNGs de últimos N días
- **POST** `/api/radar/LOXX/download-pngs/date?date=2025-12-06` - Descargar PNGs de una fecha específica

### Para Leer desde PostgreSQL (Para el Visor):

- **GET** `/api/radar/LOXX/pngs` - Lista de PNGs con paginación
- **GET** `/api/radar/LOXX/pngs/viewer-index` - Índice completo para el visor
- **GET** `/api/radar/LOXX/pngs?date=2025-12-06` - PNGs de una fecha específica
- **GET** `/api/radar/pngs/:id` - Metadata de un PNG específico
- **GET** `/api/radar/pngs/:id/image` - Imagen PNG (binary)

---

## 🔄 Flujo Completo del Sistema

```
1. PC Remota:
   F:\LOXX\H5\ (archivos .h5.gz)
     ↓
   process_loxx_h5_compressed.py
     ↓
   F:\LOXX\PNG_OUTPUT\ (PNGs convertidos)
     ↓
   radar_server_loxx.py (puerto 8080)
     ↓
   http://100.100.81.47:8080/api/radar/index

2. PC Local (Automático):
   Backend consulta http://100.100.81.47:8080
     ↓
   Detecta PNGs nuevos
     ↓
   Descarga PNGs automáticamente
     ↓
   Sube a PostgreSQL local
     ↓
   ✅ Listo en PostgreSQL

3. Visor:
   Consulta API: http://localhost:5000/api/radar/LOXX/pngs/viewer-index
     ↓
   Lee desde PostgreSQL
     ↓
   Muestra imágenes en el visor
```

---

## ❓ Solución de Problemas

### Los PNGs no se descargan automáticamente

1. Verifica que `ENABLE_PNG_SYNC=true` esté en `.env`
2. Verifica que `RADAR_LOXX_URL=http://100.100.81.47:8080` esté configurado
3. Reinicia el servidor después de cambiar `.env`
4. Revisa los logs del servidor para errores

### Los PNGs no se guardan en PostgreSQL

1. Verifica que `STORE_PNG_IN_DB=true` esté en `.env`
2. Verifica la conexión a PostgreSQL:
   ```bash
   # Probar conexión
   psql -h localhost -U tu_usuario -d radar_metadata
   ```
3. Verifica que las tablas existan (se crean automáticamente al iniciar)

### Error de conexión a PC remota

1. Verifica que Tailscale esté conectado:
   ```bash
   # En PC remota
   tailscale status
   ```
2. Prueba la conexión:
   ```bash
   curl http://100.100.81.47:8080/api/radar/index
   ```
3. Verifica el firewall de Windows en la PC remota

### La API no devuelve datos

1. Verifica que haya PNGs en PostgreSQL:
   ```sql
   SELECT COUNT(*) FROM radar_products WHERE radar_id = 'LOXX';
   ```
2. Verifica que el servidor backend esté corriendo
3. Prueba la API directamente:
   ```bash
   curl http://localhost:5000/api/radar/LOXX/pngs?limit=5
   ```

---

## ✅ Checklist Final

- [ ] `.env` configurado con PostgreSQL
- [ ] `STORE_PNG_IN_DB=true` en `.env`
- [ ] `ENABLE_PNG_SYNC=true` en `.env`
- [ ] `RADAR_LOXX_URL=http://100.100.81.47:8080` en `.env`
- [ ] Servidor backend iniciado (`npm start`)
- [ ] Logs muestran sincronización automática activa
- [ ] PNGs descargados y guardados en PostgreSQL
- [ ] API responde correctamente (`/api/radar/LOXX/pngs`)

---

## 🎉 ¡Listo!

Una vez configurado, el sistema funciona **completamente automático**:

1. ✅ PC remota convierte H5 → PNG
2. ✅ PC local descarga PNGs automáticamente cada 5 minutos
3. ✅ PNGs se suben a PostgreSQL automáticamente
4. ✅ Visor consume desde PostgreSQL vía API

**No necesitas hacer nada manualmente después de la configuración inicial.**

