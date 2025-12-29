# 🔄 Configuración Separada: GUAXX y LOXX

## ✅ Estado Actual: **YA ESTÁN SEPARADOS**

Cada radar (GUAXX y LOXX) tiene su propia configuración y endpoints separados.

---

## 📡 1. URLs Remotas Separadas

### Configuración en `.env`:

```env
# Radar GUAXX (PC remota GUAXX)
RADAR_LGUAXX_URL=http://100.124.134.19:8080

# Radar LOXX (PC remota LOXX)
RADAR_LOXX_URL=http://100.100.81.47:8080
```

### Código (`remoteRadarService.js`):

```javascript
const RADAR_URLS = {
  LGUAXX: process.env.RADAR_LGUAXX_URL,  // URL específica para GUAXX
  LOXX: process.env.RADAR_LOXX_URL       // URL específica para LOXX
};
```

**Cada radar consulta su propia URL remota.**

---

## 🗄️ 2. Endpoints de PostgreSQL Separados

### Para GUAXX:

```
GET /api/radar/LGUAXX/pngs/viewer-index
GET /api/radar/LGUAXX/pngs
GET /api/radar/LGUAXX/pngs/latest-today
GET /api/radar/pngs/:id/image  (donde id es de GUAXX)
```

### Para LOXX:

```
GET /api/radar/LOXX/pngs/viewer-index
GET /api/radar/LOXX/pngs
GET /api/radar/LOXX/pngs/latest-today
GET /api/radar/pngs/:id/image  (donde id es de LOXX)
```

**Cada radar tiene sus propios endpoints en PostgreSQL.**

---

## 🔄 3. Sincronización Automática Separada

### Servicio de Sincronización (`PNGSyncService`):

```javascript
// En server.js
const radars = ['LGUAXX', 'LOXX'];

radars.forEach(radarId => {
  const syncService = new PNGSyncService({
    radarId,  // Cada radar tiene su propio servicio
    syncInterval: 300000  // 5 minutos
  });
  
  syncService.start();
});
```

**Cada radar tiene su propio servicio de sincronización que:**
- Consulta su propia URL remota (`RADAR_LGUAXX_URL` o `RADAR_LOXX_URL`)
- Descarga PNGs desde su servidor remoto
- Guarda en PostgreSQL con `radar_id = 'LGUAXX'` o `radar_id = 'LOXX'`

---

## 📊 4. Estructura en PostgreSQL

### Tabla `radar_products`:

```sql
SELECT 
    radar_id,  -- 'LGUAXX' o 'LOXX'
    COUNT(*) as total_pngs,
    COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as con_imagen
FROM radar_products
WHERE product_type = 'ppi_png'
GROUP BY radar_id;
```

**Resultado esperado:**
```
radar_id | total_pngs | con_imagen
---------|------------|------------
LGUAXX   | 1500       | 1500
LOXX     | 800        | 800
```

**Cada radar tiene sus propios registros en PostgreSQL.**

---

## 🔍 5. Flujo Completo por Radar

### GUAXX:

```
1. PC Remota GUAXX
   └─ Servidor HTTP: http://100.124.134.19:8080
       ↓
2. PC Local - Sincronización GUAXX
   └─ Consulta: http://100.124.134.19:8080/index.json
   └─ Descarga PNGs
   └─ Guarda en PostgreSQL con radar_id = 'LGUAXX'
       ↓
3. Visor - Consulta API Local
   └─ GET /api/radar/LGUAXX/pngs/viewer-index
   └─ PostgreSQL filtra por radar_id = 'LGUAXX'
   └─ Devuelve solo PNGs de GUAXX
```

### LOXX:

```
1. PC Remota LOXX
   └─ Servidor HTTP: http://100.100.81.47:8080
       ↓
2. PC Local - Sincronización LOXX
   └─ Consulta: http://100.100.81.47:8080/index.json
   └─ Descarga PNGs
   └─ Guarda en PostgreSQL con radar_id = 'LOXX'
       ↓
3. Visor - Consulta API Local
   └─ GET /api/radar/LOXX/pngs/viewer-index
   └─ PostgreSQL filtra por radar_id = 'LOXX'
   └─ Devuelve solo PNGs de LOXX
```

---

## ✅ Verificación

### 1. Verificar URLs Configuradas:

```bash
cd tesis_utpl/backend
node -e "require('dotenv').config(); console.log('GUAXX:', process.env.RADAR_LGUAXX_URL); console.log('LOXX:', process.env.RADAR_LOXX_URL);"
```

**Deberías ver:**
```
GUAXX: http://100.124.134.19:8080
LOXX: http://100.100.81.47:8080
```

### 2. Verificar Endpoints de PostgreSQL:

```bash
# GUAXX
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index | jq '.radar, .index | length'

# LOXX
curl http://localhost:5000/api/radar/LOXX/pngs/viewer-index | jq '.radar, .index | length'
```

**Deberías ver diferentes resultados para cada radar.**

### 3. Verificar en PostgreSQL:

```sql
-- Contar PNGs por radar
SELECT 
    radar_id,
    COUNT(*) as total,
    COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as con_imagen
FROM radar_products
WHERE product_type = 'ppi_png'
GROUP BY radar_id;
```

**Deberías ver registros separados para cada radar.**

### 4. Verificar Sincronización:

En los logs del servidor backend, deberías ver:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] Consultando índice remoto desde: http://100.124.134.19:8080/index.json
[png-sync] ✓ PNG sincronizado: LGUAXX_20250718_160000.png

[png-sync] Iniciando sincronización para LOXX...
[png-sync] Consultando índice remoto desde: http://100.100.81.47:8080/index.json
[png-sync] ✓ PNG sincronizado: LOXX_20250718_160000.png
```

**Cada radar sincroniza desde su propia URL.**

---

## 🎯 Resumen

✅ **URLs Remotas Separadas:**
- GUAXX: `RADAR_LGUAXX_URL` → `http://100.124.134.19:8080`
- LOXX: `RADAR_LOXX_URL` → `http://100.100.81.47:8080`

✅ **Endpoints de PostgreSQL Separados:**
- GUAXX: `/api/radar/LGUAXX/pngs/*`
- LOXX: `/api/radar/LOXX/pngs/*`

✅ **Sincronización Separada:**
- Cada radar tiene su propio `PNGSyncService`
- Cada uno consulta su propia URL remota
- Cada uno guarda en PostgreSQL con su `radar_id`

✅ **Datos Separados en PostgreSQL:**
- `radar_id = 'LGUAXX'` → PNGs de GUAXX
- `radar_id = 'LOXX'` → PNGs de LOXX

**Todo está correctamente separado. Cada radar funciona de forma independiente.**


