# ✅ Solución: Descarga de PNGs desde /index.json

## 🔍 Problema Identificado

El servicio de descarga de PNGs fallaba porque:
1. Intentaba primero `/api/radar/index` (que también funciona pero tarda más)
2. El timeout era insuficiente (60 segundos)
3. El servidor remoto tiene **65,975 PNGs** y tarda ~25-30 segundos en responder

## ✅ Solución Implementada

### 1. **Priorizado `/index.json` como Primero**
```javascript
const candidates = [
  new URL('index.json', baseUrl).href,      // PRIMERO - el que funciona (25.91s)
  new URL('api/radar/index', baseUrl).href, // Segundo (31.02s)
  new URL('index', baseUrl).href            // Tercero (404)
];
```

### 2. **Timeout Aumentado**
- **Antes:** 30-60 segundos
- **Ahora:** 180 segundos (3 minutos) para el endpoint principal
- **Razón:** El servidor tiene 65,975 PNGs y tarda ~25-30 segundos en responder

### 3. **Headers Mejorados**
```javascript
headers: {
  'Connection': 'keep-alive',
  'Accept': 'application/json'
}
```

### 4. **Validación de Estado HTTP**
```javascript
validateStatus: (status) => status >= 200 && status < 300
```

## 📊 Resultados de Prueba

```
✅ http://100.100.81.47:8080/index.json
   - Tiempo: 25.91 segundos
   - Status: 200
   - Fechas: 145
   - PNGs: 65,975

✅ http://100.100.81.47:8080/api/radar/index
   - Tiempo: 31.02 segundos
   - Status: 200
   - Fechas: 145
   - PNGs: 65,975
```

## 🔄 Flujo Actualizado

```
1. Servicio intenta obtener índice
   ↓
2. Intenta primero: /index.json (timeout: 180s)
   ↓
3. Si falla, intenta: /api/radar/index (timeout: 120s)
   ↓
4. Si falla, intenta: /index (timeout: 120s)
   ↓
5. Si todos fallan, muestra error
```

## 🧪 Cómo Verificar

### 1. Probar Conexión Manualmente
```bash
cd tesis_utpl/backend
node scripts/probar_indice_remoto.js
```

Deberías ver:
```
✅ http://100.100.81.47:8080/index.json (25.91s)
```

### 2. Verificar Logs del Servidor
Cuando el servicio de sincronización intente descargar, deberías ver:
```
✓ Índice remoto obtenido desde: http://100.100.81.47:8080/index.json (145 fechas)
[png-sync] Descargando PNG: LOXX_20250718_160000.png
[png-sync] ✓ PNG sincronizado: LOXX_20250718_160000.png (ID: 123)
```

### 3. Verificar en PostgreSQL
```sql
SELECT COUNT(*) FROM radar_products 
WHERE radar_id = 'LOXX' AND png_data IS NOT NULL;
```

## ⚙️ Configuración Opcional

Si necesitas aumentar aún más el timeout, edita `.env`:

```env
RADAR_REMOTE_INDEX_TIMEOUT_MS=300000  # 5 minutos
```

## 🎯 Resumen

✅ **Priorizado `/index.json`** - El endpoint que funciona  
✅ **Timeout aumentado** - 180 segundos (3 minutos)  
✅ **Headers mejorados** - Connection keep-alive  
✅ **Validación mejorada** - Manejo de errores HTTP  

**El servicio ahora debería descargar los PNGs correctamente.**


