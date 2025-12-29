# 🔍 Cómo Verificar que la Sincronización Está Funcionando

## ✅ Verificación Rápida

### 1. Verificar en los logs del servidor

Cuando inicies el servidor (`npm start`), deberías ver:

```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[auto-services] ✓ Sincronización PNG iniciada para LGUAXX (cada 300s)
[png-sync] Iniciando servicio de sincronización para LGUAXX
[png-sync] Intervalo: 300 segundos
[png-sync] Servicio iniciado. Sincronizando cada 300 segundos
```

**Si NO ves estos mensajes**, significa que `ENABLE_PNG_SYNC` no está activado.

### 2. Ver logs de sincronización

Cada 5 minutos (o el intervalo configurado), deberías ver:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] Descargando PNG: LGUAXX_20250124_120000.png (2025-01-24)
[png-sync] ✓ PNG sincronizado: LGUAXX_20250124_120000.png (ID: 123)
[png-sync] Sincronización completada en 12.5s
[png-sync] Total: 5, Descargados: 3, Omitidos: 2, Errores: 0
```

**Si NO ves estos mensajes cada 5 minutos**, la sincronización no está funcionando.

---

## 🔧 Verificar Configuración

### Usar el script de verificación

```bash
cd backend
node scripts/verificar_sincronizacion.js
```

O en Windows:
```bash
cd backend\scripts
verificar_sincronizacion.bat
```

Este script te dirá:
- ✅ Si PostgreSQL está configurado
- ✅ Si `STORE_PNG_IN_DB` está activado
- ✅ Si `ENABLE_PNG_SYNC` está activado
- ✅ Si las URLs remotas están configuradas
- ✅ Cuántos PNGs hay en PostgreSQL
- ✅ Probará una sincronización manual

---

## 📊 Verificar PNGs en PostgreSQL

### Opción 1: Usar la API

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs?limit=10
```

O desde el navegador:
```
http://localhost:5000/api/radar/LGUAXX/pngs?limit=10
```

Deberías ver una lista de PNGs con sus IDs, nombres, timestamps, etc.

### Opción 2: Consultar directamente PostgreSQL

```sql
SELECT 
    id, 
    filename, 
    source_timestamp, 
    file_size,
    processed_at
FROM radar_products 
WHERE radar_id = 'LGUAXX' 
  AND product_type = 'ppi_png'
ORDER BY source_timestamp DESC 
LIMIT 10;
```

### Opción 3: Ver índice de PNGs

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/index
```

---

## 🚨 Problemas Comunes

### No veo mensajes de sincronización

**Causa**: `ENABLE_PNG_SYNC` no está activado

**Solución**: Agrega a `backend/.env`:
```env
ENABLE_PNG_SYNC=true
```

Luego reinicia el servidor.

### Veo "Sincronización deshabilitada"

**Causa**: La variable no está en `true`

**Solución**: Verifica que en `.env` tengas exactamente:
```env
ENABLE_PNG_SYNC=true
```

No uses comillas ni espacios.

### No descarga PNGs nuevos

**Causas posibles**:
1. La PC remota no está accesible
2. La URL remota está mal configurada
3. No hay PNGs nuevos en la PC remota

**Solución**:
1. Verifica que puedas acceder a la API remota:
   ```bash
   curl http://100.124.134.19:8080/api/radar/index
   ```
2. Verifica la URL en `.env`:
   ```env
   RADAR_LGUAXX_URL=http://100.124.134.19:8080
   ```

### Los PNGs no se suben a PostgreSQL

**Causas posibles**:
1. `STORE_PNG_IN_DB` no está activado
2. Error de conexión a PostgreSQL
3. PostgreSQL no está corriendo

**Solución**:
1. Verifica `.env`:
   ```env
   STORE_PNG_IN_DB=true
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=radar_metadata
   ```
2. Verifica que PostgreSQL esté corriendo
3. Revisa los logs del servidor para errores específicos

---

## 🧪 Probar Sincronización Manual

Si quieres forzar una sincronización inmediata sin esperar el intervalo:

### Opción 1: Usar el endpoint de API

```bash
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=1"
```

### Opción 2: Usar el script

```bash
cd backend
node scripts/probar_descarga_pngs.js LGUAXX recent 1
```

---

## 📝 Checklist de Verificación

- [ ] `ENABLE_PNG_SYNC=true` en `.env`
- [ ] `STORE_PNG_IN_DB=true` en `.env`
- [ ] PostgreSQL configurado y corriendo
- [ ] `RADAR_LGUAXX_URL` configurada en `.env`
- [ ] Servidor iniciado con `npm start`
- [ ] Veo mensajes de sincronización en los logs
- [ ] Veo PNGs en PostgreSQL (consulta SQL o API)
- [ ] Los PNGs tienen `file_size` y `source_timestamp`

---

## ✅ Resumen

**Para verificar que funciona:**

1. **Revisa los logs del servidor** - Deberías ver mensajes cada 5 minutos
2. **Consulta la API** - `http://localhost:5000/api/radar/LGUAXX/pngs`
3. **Usa el script de verificación** - `node scripts/verificar_sincronizacion.js`

**Si todo está bien configurado, deberías ver PNGs descargándose y subiéndose automáticamente cada 5 minutos.**

