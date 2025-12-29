# ⚡ Guía Rápida: Sincronización Automática PC Local

## 🎯 ¿Qué hace?

Descarga automáticamente PNGs desde la PC remota y los sube a PostgreSQL local.

**Todo automático. No necesitas ejecutar comandos.**

---

## 📝 Configuración (2 pasos)

### Paso 1: Editar `.env`

Abre `backend/.env` y agrega:

```env
# Activar sincronización automática
ENABLE_PNG_SYNC=true

# PostgreSQL local
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=radar_metadata
STORE_PNG_IN_DB=true

# URL de PC remota (ya deberías tenerla)
RADAR_LGUAXX_URL=http://100.124.134.19:8080
```

### Paso 2: Iniciar servidor

```bash
cd backend
npm start
```

**¡Listo!** La sincronización funciona automáticamente.

---

## 🔍 Verificar

Deberías ver:

```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[png-sync] Servicio iniciado. Sincronizando cada 300 segundos
```

Cada 5 minutos:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] ✓ PNG sincronizado: LGUAXX_archivo.png
```

---

## ⚙️ Configuración Avanzada

### Cambiar intervalo

```env
# Cada 2 minutos
PNG_SYNC_INTERVAL=120000

# Cada 10 minutos
PNG_SYNC_INTERVAL=600000
```

---

## ✅ Resumen

1. ✅ `ENABLE_PNG_SYNC=true` en `.env`
2. ✅ Configura PostgreSQL local
3. ✅ `npm start`
4. ✅ **¡Listo!** Todo automático

**No necesitas ejecutar comandos manualmente.**

