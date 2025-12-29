# 🚀 Configuración Automática Completa para LOXX

Esta guía explica cómo configurar el procesamiento automático de archivos H5 de LOXX y la carga automática en el visor.

## 📋 Arquitectura

```
PC REMOTA:
  └─ Archivos H5 comprimidos (.h5.gz)
      ↓
  └─ h5_auto_processor_service.py (monitorea y procesa)
      ↓
  └─ PNGs generados en F:\LOXX\PNG_OUTPUT
      ↓
  └─ Servidor HTTP sirve PNGs (puerto 8080)

PC LOCAL:
  └─ PNGSyncService (sincroniza cada 5 minutos)
      ↓
  └─ PostgreSQL Local (almacena PNGs)
      ↓
  └─ Visor (carga automáticamente última imagen del día)
```

---

## 🔧 Paso 1: Configuración en PC REMOTA

### 1.1 Instalar dependencias

```bash
pip install watchdog
```

### 1.2 Copiar archivos necesarios

Asegúrate de tener en la PC REMOTA:
- `process_loxx_h5_compressed.py` (incluye monitoreo automático integrado)
- `iniciar_h5_watcher.bat` (opcional, facilita el inicio)

### 1.3 Iniciar el servicio de monitoreo

**Opción A: Usar el script batch (recomendado)**
```bash
iniciar_h5_watcher.bat
```

**Opción B: Usar Python directamente**
```bash
python process_loxx_h5_compressed.py ^
    --watch ^
    --input-dir "F:\LOXX\H5" ^
    --output-dir "F:\LOXX\PNG_OUTPUT" ^
    --radar-id LOXX
```

**Nota:** El modo `--watch` está integrado directamente en `process_loxx_h5_compressed.py`, no necesitas un script separado.

### 1.4 Verificar que funciona

**Al iniciar, el servicio:**
1. **Primero procesa todos los archivos existentes** en el directorio
2. **Luego inicia el monitoreo** para nuevos archivos

Salida esperada:
```
============================================================
PROCESANDO ARCHIVOS EXISTENTES
============================================================
Buscando archivos H5 comprimidos en: F:\LOXX\H5
Encontrados 15 archivos H5 comprimidos para procesar
Procesando archivos existentes...

✓ Procesado exitosamente: archivo1.h5.gz -> LOXX_20250711_160000.png
✓ Procesado exitosamente: archivo2.h5.gz -> LOXX_20250711_160100.png
...

============================================================
✓ Procesados 15 archivos existentes
============================================================

============================================================
INICIANDO MONITOREO DE NUEVOS ARCHIVOS
============================================================
MODO MONITOREO ACTIVO
============================================================
Directorio H5: F:\LOXX\H5
Directorio PNG: F:\LOXX\PNG_OUTPUT
Radar ID: LOXX
Tiempo de espera: 5.0 segundos
============================================================
Esperando nuevos archivos H5 comprimidos...
Presiona Ctrl+C para detener
============================================================
```

Cuando detecte un nuevo archivo:
```
[watch] Procesando nuevo archivo H5: 1003_20250711_160000.h5.gz
[watch] ✓ Procesado exitosamente: 1003_20250711_160000.h5.gz -> LOXX_20250711_160000.png
```

**Nota:** Si quieres saltar el procesamiento de archivos existentes y solo monitorear nuevos, usa:
```bash
python process_loxx_h5_compressed.py --watch --skip-existing --output-dir F:\LOXX\PNG_OUTPUT
```

---

## 🔧 Paso 2: Configuración en PC LOCAL

### 2.1 Configurar `.env` del backend

Agrega estas variables en `backend/.env`:

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
# URL DE LA PC REMOTA
# ============================================

# URL de la PC remota donde se sirven los PNGs
RADAR_LOXX_URL=http://100.100.81.47:8080
```

### 2.2 Iniciar el servidor backend

```bash
cd backend
npm start
```

Deberías ver:
```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[auto-services] ✓ Sincronización PNG iniciada para LOXX (cada 300s)
```

---

## 🎯 Paso 3: Verificar el Flujo Completo

### 3.1 En PC REMOTA

1. Coloca un archivo `.h5.gz` en `F:\LOXX\H5`
2. El servicio debería detectarlo y procesarlo automáticamente
3. Verifica que se generó el PNG en `F:\LOXX\PNG_OUTPUT`

### 3.2 En PC LOCAL

1. Espera máximo 5 minutos (o el intervalo configurado)
2. El servicio de sincronización descargará el PNG automáticamente
3. El PNG se guardará en PostgreSQL local

### 3.3 En el Visor

1. Abre el visor en tu navegador
2. Debería cargar automáticamente la última imagen del día actual para LOXX
3. Si no hay imágenes del día actual, verás un mensaje en la consola

---

## 🔍 Verificación y Debugging

### Verificar que el servicio está corriendo (PC REMOTA)

```bash
# Verificar procesos Python
tasklist | findstr python
```

### Verificar sincronización (PC LOCAL)

Revisa los logs del servidor:
```
[png-sync] Descargando PNG: LOXX_20250711_160000.png (2025-07-11)
[png-sync] ✓ PNG sincronizado: LOXX_20250711_160000.png (ID: 123)
```

### Verificar carga automática en el visor

Abre la consola del navegador (F12) y deberías ver:
```
[Visor] Cargando última imagen del día actual para LOXX...
[Visor] ✓ Última imagen del día cargada: LOXX_20250711_160000.png
```

---

## ⚙️ Configuración Avanzada

### Cambiar intervalo de sincronización

En `backend/.env`:
```env
PNG_SYNC_INTERVAL=60000  # 1 minuto (60000 ms)
```

### Cambiar tiempo de espera antes de procesar

Al ejecutar con el flag `--debounce-time`:
```bash
python process_loxx_h5_compressed.py --watch --debounce-time 10.0 --output-dir F:\LOXX\PNG_OUTPUT
```

### Comportamiento del modo --watch

Por defecto, cuando inicias el modo `--watch`:
1. **Primero procesa todos los archivos existentes** en el directorio
2. **Luego inicia el monitoreo** para nuevos archivos

Esto asegura que no se pierdan archivos que ya estaban en el directorio antes de iniciar el servicio.

Si quieres **saltar el procesamiento de archivos existentes** y solo monitorear nuevos:
```bash
python process_loxx_h5_compressed.py --watch --skip-existing --output-dir F:\LOXX\PNG_OUTPUT
```

Si quieres **solo procesar archivos existentes** sin monitorear:
```bash
python process_loxx_h5_compressed.py --input-dir "F:\LOXX\H5" --output-dir "F:\LOXX\PNG_OUTPUT" --recursive
```

---

## 🐛 Solución de Problemas

### El servicio no detecta archivos nuevos

1. Verifica que el servicio esté corriendo
2. Verifica que el directorio sea correcto
3. Verifica permisos de lectura en el directorio

### Los PNGs no se sincronizan

1. Verifica que `ENABLE_PNG_SYNC=true` en `.env`
2. Verifica que la URL de la PC remota sea correcta
3. Verifica que el servidor HTTP en PC remota esté funcionando
4. Revisa los logs del servidor backend

### El visor no carga la última imagen

1. Verifica que haya imágenes procesadas para el día actual
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que el endpoint `/api/radar/LOXX/pngs/latest-today` funcione

---

## 📝 Resumen

**PC REMOTA:**
- ✅ Ejecutar `iniciar_h5_watcher.bat` o `python process_loxx_h5_compressed.py --watch`
- ✅ Monitorea `F:\LOXX\H5` automáticamente
- ✅ Procesa archivos `.h5.gz` cuando los detecta
- ✅ Genera PNGs en `F:\LOXX\PNG_OUTPUT`
- ✅ Todo integrado en un solo script (`process_loxx_h5_compressed.py`)

**PC LOCAL:**
- ✅ Configurar `ENABLE_PNG_SYNC=true` en `.env`
- ✅ Iniciar servidor backend
- ✅ El servicio sincroniza PNGs automáticamente cada 5 minutos
- ✅ El visor carga automáticamente la última imagen del día

**Todo es automático. No necesitas ejecutar comandos manualmente después de la configuración inicial.**

