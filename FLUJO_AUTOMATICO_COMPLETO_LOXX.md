# 🔄 Flujo Automático Completo LOXX - Explicación

## ✅ SÍ, TODO ES AUTOMÁTICO

Cuando detectas un nuevo archivo en la PC remota, el sistema hace TODO automáticamente sin intervención manual.

---

## 🔄 Flujo Completo Paso a Paso

### 1️⃣ PC REMOTA: Detección y Procesamiento

```
Archivo nuevo: 1003_20250718_160000.h5.gz
    ↓
Llega a: F:\LOXX\H5\
    ↓
Procesador H5 detecta automáticamente (iniciar_h5_watcher.bat)
    ↓
Espera 5 segundos (para asegurar que el archivo esté completo)
    ↓
Ejecuta: process_loxx_h5_compressed.py
    ↓
Procesa el archivo H5 → PNG
    ↓
Genera: F:\LOXX\PNG_OUTPUT\2025-07-18\LOXX_20250718_160000.png
    ↓
Genera metadata: F:\LOXX\PNG_OUTPUT\2025-07-18\LOXX_20250718_160000.json
```

**Tiempo estimado:** 30-60 segundos (dependiendo del tamaño del archivo)

### 2️⃣ PC REMOTA: Servidor HTTP Sirve el PNG

```
PNG generado en: F:\LOXX\PNG_OUTPUT\2025-07-18\LOXX_20250718_160000.png
    ↓
Servidor HTTP (start_loxx_server.bat) detecta el nuevo archivo
    ↓
Actualiza el índice automáticamente
    ↓
PNG disponible en: http://100.100.81.47:8080/api/radar/index
```

**Tiempo estimado:** Inmediato (el servidor HTTP ya está corriendo)

### 3️⃣ PC LOCAL: Sincronización Automática

```
Servicio de sincronización (PNGSyncService) corre cada 5 minutos
    ↓
Consulta: http://100.100.81.47:8080/api/radar/index
    ↓
Detecta PNG nuevo: LOXX_20250718_160000.png
    ↓
Descarga el PNG automáticamente desde la PC remota
    ↓
Lee el metadata JSON (si existe)
    ↓
Sube a PostgreSQL local automáticamente
    ↓
Guarda el PNG en la base de datos (columna png_data)
```

**Tiempo estimado:** Máximo 5 minutos (intervalo de sincronización)

### 4️⃣ PC LOCAL: Visor Carga Automáticamente

```
PNG guardado en PostgreSQL
    ↓
Visor consulta: /api/radar/LOXX/pngs/latest-today
    ↓
Obtiene la última imagen del día actual
    ↓
Carga automáticamente en el mapa
```

**Tiempo estimado:** Inmediato (cuando abres el visor)

---

## ⏱️ Tiempo Total del Flujo

```
Archivo H5 llega a PC remota
    ↓
[30-60 segundos] → Procesamiento H5 → PNG
    ↓
[Inmediato] → Servidor HTTP sirve PNG
    ↓
[Máximo 5 minutos] → Sincronización a PC local
    ↓
[Inmediato] → Guardado en PostgreSQL
    ↓
[Inmediato] → Disponible en el visor
```

**Tiempo total:** ~6-7 minutos desde que llega el archivo hasta que está en el visor.

---

## ✅ Checklist de Verificación

### PC REMOTA - Debe estar corriendo:

- [x] **Procesador H5:** `iniciar_h5_watcher.bat` (monitorea `F:\LOXX\H5`)
- [x] **Servidor HTTP:** `start_loxx_server.bat` (sirve PNGs en puerto 8080)

### PC LOCAL - Debe estar corriendo:

- [x] **Servidor Backend:** `npm start` (sincroniza cada 5 minutos)
- [x] **PostgreSQL:** Funcionando y accesible

### Configuración en `backend/.env`:

- [x] `ENABLE_PNG_SYNC=true` (sincronización automática activa)
- [x] `RADAR_LOXX_URL=http://100.100.81.47:8080` (URL correcta)
- [x] `STORE_PNG_IN_DB=true` (guardar PNGs en PostgreSQL)
- [x] `PNG_SYNC_INTERVAL=300000` (5 minutos, opcional)

---

## 🎯 Ejemplo Real

### Escenario: Nuevo archivo H5 llega a las 16:00:00

```
16:00:00 - Archivo llega: 1003_20250718_160000.h5.gz
16:00:05 - Procesador detecta el archivo
16:00:30 - Procesamiento completado → PNG generado
16:00:30 - Servidor HTTP actualiza índice
16:05:00 - Servicio sincroniza (máximo, puede ser antes)
16:05:01 - PNG descargado y guardado en PostgreSQL
16:05:01 - Disponible en el visor
```

---

## 🔍 Cómo Verificar que Funciona

### 1. Verificar Procesamiento (PC REMOTA)

En la ventana del procesador H5, deberías ver:

```
[watch] Procesando nuevo archivo H5: 1003_20250718_160000.h5.gz
[watch] ✓ Procesado exitosamente: 1003_20250718_160000.h5.gz -> LOXX_20250718_160000.png
```

### 2. Verificar Servidor HTTP (PC REMOTA)

En la ventana del servidor HTTP, deberías ver:

```
[2025-07-18 16:00:30] "GET /api/radar/index HTTP/1.1" 200 -
```

### 3. Verificar Sincronización (PC LOCAL)

En los logs del servidor backend, deberías ver:

```
[png-sync] Sincronizando PNGs para LOXX...
[png-sync] Consultando índice remoto...
[png-sync] Encontrados 1 PNGs nuevos
[png-sync] Descargando PNG: LOXX_20250718_160000.png
[png-sync] ✓ PNG sincronizado: LOXX_20250718_160000.png (ID: 123)
```

### 4. Verificar PostgreSQL (PC LOCAL)

```sql
SELECT 
    filename, 
    source_timestamp,
    created_at
FROM radar_products 
WHERE radar_id = 'LOXX' 
ORDER BY source_timestamp DESC 
LIMIT 5;
```

Deberías ver el PNG recién sincronizado.

### 5. Verificar Visor (PC LOCAL)

1. Abre el visor
2. Activa LOXX
3. Debería mostrar la última imagen automáticamente

---

## 🎉 Resumen

**SÍ, TODO ES AUTOMÁTICO:**

1. ✅ **PC Remota:** Detecta H5 → Procesa → Genera PNG
2. ✅ **PC Remota:** Servidor HTTP sirve PNG
3. ✅ **PC Local:** Sincroniza PNG automáticamente (cada 5 min)
4. ✅ **PC Local:** Guarda en PostgreSQL automáticamente
5. ✅ **PC Local:** Visor carga automáticamente

**No necesitas hacer NADA manual después de la configuración inicial.**

---

## ⚠️ Notas Importantes

1. **Intervalo de sincronización:** Por defecto es 5 minutos. Si quieres que sea más rápido, cambia `PNG_SYNC_INTERVAL` en `.env` (en milisegundos).

2. **Procesamiento puede tardar:** El procesamiento de H5 puede tardar 30-60 segundos dependiendo del tamaño del archivo. Esto es normal.

3. **Servicios deben estar corriendo:** Ambos servicios en PC remota (procesador + servidor HTTP) y el servidor backend en PC local deben estar corriendo constantemente.

4. **Primera sincronización:** La primera vez puede tardar más si hay muchos PNGs para sincronizar.


