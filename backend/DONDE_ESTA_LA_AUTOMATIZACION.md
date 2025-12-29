# 📍 Dónde Está la Automatización de Subida a PostgreSQL

## 🔍 Ubicación del Código

### 1. Configuración en `server.js` (Líneas 117-138)

El servidor inicia automáticamente el servicio de sincronización aquí:

```javascript
// Servicio de sincronización desde PC remota (para PC local)
const enablePNGSync = process.env.ENABLE_PNG_SYNC === 'true' || process.env.ENABLE_PNG_SYNC === '1';

if (enablePNGSync) {
  console.log('[auto-services] Iniciando sincronización automática de PNGs desde PC remota...');
  
  const radars = ['LGUAXX', 'LOXX'];
  const syncInterval = parseInt(process.env.PNG_SYNC_INTERVAL || '300000', 10); // 5 minutos
  
  radars.forEach(radarId => {
    const syncService = new PNGSyncService({
      radarId,
      syncInterval,
    });
    
    syncService.start(); // ← AQUÍ SE INICIA LA AUTOMATIZACIÓN
    pngSyncServices.push(syncService);
  });
}
```

**Archivo**: `backend/server.js` (líneas 117-138)

---

### 2. Servicio de Sincronización: `pngSyncService.js`

El servicio que hace el trabajo automático está en:

**Archivo**: `backend/services/pngSyncService.js`

**Función principal**: `performSync()` (línea ~200)
- Consulta la PC remota
- Descarga PNGs nuevos
- Los sube a PostgreSQL automáticamente

**Función de inicio**: `start()` (línea ~273)
- Se ejecuta inmediatamente al iniciar
- Luego se ejecuta cada 5 minutos (o el intervalo configurado)

---

## ⚙️ Configuración Necesaria

### En `backend/.env`:

```env
# Activar sincronización automática
ENABLE_PNG_SYNC=true

# Intervalo (opcional, por defecto: 5 minutos = 300000 ms)
PNG_SYNC_INTERVAL=300000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=radar_metadata
STORE_PNG_IN_DB=true

# URL de PC remota
RADAR_LGUAXX_URL=http://100.124.134.19:8080
```

---

## 🔍 Cómo Verificar que Está Funcionando

### 1. Al iniciar el servidor, deberías ver:

```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[png-sync] Iniciando servicio de sincronización para LGUAXX
[png-sync] Intervalo: 300 segundos
[png-sync] Servicio iniciado. Sincronizando cada 300 segundos
[auto-services] ✓ Sincronización PNG iniciada para LGUAXX (cada 300s)
```

**Si NO ves estos mensajes**, significa que `ENABLE_PNG_SYNC` no está activado.

### 2. Cada 5 minutos deberías ver:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] Descargando PNG: LGUAXX_20250124_120000.png (2025-01-24)
[png-sync] ✓ PNG sincronizado: LGUAXX_20250124_120000.png (ID: 123)
[png-sync] Sincronización completada en 12.5s
[png-sync] Total: 5, Descargados: 3, Omitidos: 2, Errores: 0
```

---

## 🚨 Si No Está Funcionando

### Verificar configuración:

```bash
cd backend
node scripts/verificar_sincronizacion.js
```

Este script te dirá:
- ✅ Si `ENABLE_PNG_SYNC` está activado
- ✅ Si PostgreSQL está configurado
- ✅ Si `STORE_PNG_IN_DB` está activado
- ✅ Si las URLs remotas están configuradas

### Activar si no está activado:

1. Edita `backend/.env`
2. Agrega: `ENABLE_PNG_SYNC=true`
3. Reinicia el servidor: `npm start`

---

## 📊 Flujo Automático

```
Servidor inicia (server.js)
    ↓
Lee ENABLE_PNG_SYNC=true
    ↓
Crea PNGSyncService
    ↓
Llama syncService.start()
    ↓
Ejecuta performSync() inmediatamente
    ↓
Cada 5 minutos: performSync() automáticamente
    ↓
performSync() hace:
  1. Consulta PC remota
  2. Descarga PNGs nuevos
  3. Los sube a PostgreSQL
```

---

## 📝 Resumen

**Ubicación del código automático:**
- ✅ `backend/server.js` (líneas 117-138) - Inicia el servicio
- ✅ `backend/services/pngSyncService.js` - Hace el trabajo automático

**Para activar:**
- ✅ Agrega `ENABLE_PNG_SYNC=true` en `backend/.env`
- ✅ Reinicia el servidor

**Para verificar:**
- ✅ Revisa los logs del servidor
- ✅ Ejecuta: `node scripts/verificar_sincronizacion.js`

**La automatización está en `server.js` y se ejecuta cada 5 minutos automáticamente.**


