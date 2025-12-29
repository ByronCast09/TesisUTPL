# 🔄 Configuración: Sincronización Automática en PC Local

Esta guía explica cómo configurar la **sincronización automática** de PNGs desde la PC remota a PostgreSQL local.

## 🎯 ¿Qué hace?

1. **Monitorea** la API remota periódicamente (cada 5 minutos por defecto)
2. **Detecta** PNGs nuevos convertidos en la PC remota
3. **Descarga** automáticamente los PNGs nuevos
4. **Sube** automáticamente a PostgreSQL local

**Todo es automático. No necesitas ejecutar comandos manualmente.**

---

## 📝 Configuración en `.env`

Agrega estas variables a tu archivo `backend/.env` en la **PC LOCAL**:

```env
# ============================================
# SINCRONIZACIÓN AUTOMÁTICA PNG (PC LOCAL)
# ============================================

# Activar sincronización automática desde PC remota
ENABLE_PNG_SYNC=true

# Intervalo de sincronización en milisegundos (opcional)
# Por defecto: 300000 (5 minutos)
PNG_SYNC_INTERVAL=300000

# ============================================
# CONFIGURACIÓN DE POSTGRESQL LOCAL
# ============================================

DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=radar_metadata

# Activar almacenamiento de PNGs en la base de datos
STORE_PNG_IN_DB=true

# ============================================
# URL DE LA PC REMOTA (ya deberías tenerla)
# ============================================

RADAR_LGUAXX_URL=http://100.124.134.19:8080
RADAR_LOXX_URL=http://100.124.134.19:8080
```

---

## 🚀 Cómo Funciona

### Flujo Completo:

```
PC Remota:
  Nuevo PPI → Convierte a PNG → PNG guardado
  
PC Local (automático):
  Cada 5 minutos:
    ↓
  Consulta API remota
    ↓
  Detecta PNGs nuevos
    ↓
  Descarga PNGs automáticamente
    ↓
  Sube a PostgreSQL local automáticamente
    ↓
  ✅ Listo para usar en el visor
```

---

## ⚙️ Iniciar el Servicio

En tu **PC LOCAL**, simplemente inicia el servidor:

```bash
cd backend
npm start
```

Deberías ver en los logs:

```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[auto-services] ✓ Sincronización PNG iniciada para LGUAXX (cada 300s)
[png-sync] Iniciando servicio de sincronización para LGUAXX
[png-sync] Intervalo: 300 segundos
[png-sync] Servicio iniciado. Sincronizando cada 300 segundos
```

---

## 🔍 Verificar que Funciona

### 1. Ver logs de sincronización

Cada 5 minutos (o el intervalo configurado), verás:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] Descargando PNG: LGUAXX_20250124_120000.png (2025-01-24)
[png-sync] ✓ PNG sincronizado: LGUAXX_20250124_120000.png (ID: 123)
[png-sync] Sincronización completada en 12.5s
[png-sync] Total: 5, Descargados: 3, Omitidos: 2, Errores: 0
```

### 2. Verificar en PostgreSQL

Puedes consultar los PNGs sincronizados:

```sql
SELECT filename, source_timestamp, file_size 
FROM radar_products 
WHERE radar_id = 'LGUAXX' 
ORDER BY source_timestamp DESC 
LIMIT 10;
```

### 3. Usar la API

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs?limit=10
```

---

## ⚙️ Configuración Avanzada

### Cambiar intervalo de sincronización

```env
# Sincronizar cada 2 minutos (120000 ms)
PNG_SYNC_INTERVAL=120000

# Sincronizar cada 10 minutos (600000 ms)
PNG_SYNC_INTERVAL=600000
```

### Sincronizar solo radares específicos

El servicio sincroniza todos los radares configurados (LGUAXX, LOXX). Si quieres desactivar uno, simplemente no configures su URL:

```env
# Solo sincronizar LGUAXX
RADAR_LGUAXX_URL=http://100.124.134.19:8080
# RADAR_LOXX_URL=  (comentado o no configurado)
```

---

## 🔄 Sincronización Manual (Opcional)

Si quieres forzar una sincronización inmediata sin esperar el intervalo:

### Opción 1: Usar el endpoint de API

```bash
curl -X POST http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=1
```

### Opción 2: Usar el script

```bash
cd backend
node scripts/probar_descarga_pngs.js LGUAXX recent 1
```

---

## ❓ Solución de Problemas

### La sincronización no inicia

1. Verifica que `ENABLE_PNG_SYNC=true` esté en `.env`
2. Verifica que las URLs remotas estén configuradas
3. Reinicia el servidor después de cambiar `.env`

### No descarga PNGs nuevos

1. Verifica que la PC remota esté accesible
2. Verifica que la API remota responda: `curl http://100.124.134.19:8080/api/radar/index`
3. Revisa los logs del servidor para errores

### Los PNGs no se suben a PostgreSQL

1. Verifica que `STORE_PNG_IN_DB=true` esté en `.env`
2. Verifica la conexión a PostgreSQL local
3. Revisa los logs para errores específicos

### Error de conexión a PC remota

1. Verifica que la PC remota esté encendida
2. Verifica que el servidor de radar esté corriendo en la PC remota
3. Verifica la conectividad de red

---

## 📊 Resumen

1. ✅ **Configura `.env`** con `ENABLE_PNG_SYNC=true` y PostgreSQL local
2. ✅ **Inicia el servidor** con `npm start`
3. ✅ **¡Listo!** La sincronización funciona automáticamente cada 5 minutos

**No necesitas ejecutar comandos manualmente. Todo es automático.**

---

## 🔗 Flujo Completo del Sistema

```
PC Remota:
  PPI → Conversión automática → PNG
  
PC Local:
  Sincronización automática → Descarga PNGs → PostgreSQL local
  
Visor:
  Consulta PostgreSQL local → Muestra imágenes
```

**Todo funciona automáticamente sin intervención manual.**

