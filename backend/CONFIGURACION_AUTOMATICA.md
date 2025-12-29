# 🔄 Configuración de Automatización Completa

Esta guía explica cómo configurar la automatización completa:
1. **Conversión automática de PPI a PNG** cuando detecta nuevos archivos PPI
2. **Subida automática de PNGs a PostgreSQL** cuando detecta nuevos PNGs

## 📋 Configuración en `.env`

Agrega estas variables a tu archivo `backend/.env`:

```env
# ============================================
# AUTOMATIZACIÓN DE CONVERSIÓN PPI → PNG
# ============================================

# Activar monitoreo automático de archivos PPI
ENABLE_PPI_WATCHER=true

# Ruta donde están los archivos PPI (puede ser por radar o general)
PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi

# O específico por radar:
PPI_DATA_PATH_LGUAXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
PPI_DATA_PATH_LOXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS20\100km.ppi

# Ruta donde se guardan los PNGs convertidos
PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

# O específico por radar:
PNG_OUTPUT_PATH_LGUAXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX
PNG_OUTPUT_PATH_LOXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LOXX

# Comando Python (opcional, por defecto: python)
PYTHON_CMD=python

# ============================================
# AUTOMATIZACIÓN DE SUBIDA PNG → POSTGRESQL
# ============================================

# Activar monitoreo automático de PNGs para subir a PostgreSQL
ENABLE_PNG_UPLOADER=true

# (Las rutas PNG_OUTPUT_PATH ya están definidas arriba)

# ============================================
# CONFIGURACIÓN DE POSTGRESQL
# ============================================

DB_HOST=100.124.134.19
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=byronPost
DB_NAME=radar_metadata

# O usar URL completa:
DATABASE_URL=postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata

# Activar almacenamiento de PNGs en la base de datos
STORE_PNG_IN_DB=true
```

## 🚀 Cómo Funciona

### 1. Monitoreo de PPI (Conversión Automática)

Cuando `ENABLE_PPI_WATCHER=true`:

- ✅ El servicio monitorea el directorio `PPI_DATA_PATH`
- ✅ Cuando detecta un nuevo archivo `.ppi`, espera 5 segundos (para asegurar que el archivo esté completo)
- ✅ Ejecuta automáticamente: `python advanced_ppi_converter.py --data-path ... --output-path ... --radar-id ... --db-url ...`
- ✅ Los PNGs convertidos se guardan en `PNG_OUTPUT_PATH`

**No necesitas ejecutar el comando manualmente.** El sistema lo hace automáticamente.

### 2. Monitoreo de PNGs (Subida Automática)

Cuando `ENABLE_PNG_UPLOADER=true`:

- ✅ El servicio monitorea el directorio `PNG_OUTPUT_PATH`
- ✅ Cuando detecta un nuevo archivo `.png`, espera 3 segundos
- ✅ Lee el PNG y su metadata JSON (si existe)
- ✅ Lo sube automáticamente a PostgreSQL con todos los metadatos
- ✅ Evita duplicados (no sube el mismo archivo dos veces)

**No necesitas hacer POSTs manuales.** El sistema sube automáticamente a PostgreSQL.

## 📝 Ejemplo de Configuración Completa

```env
# PostgreSQL
DB_HOST=100.124.134.19
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=byronPost
DB_NAME=radar_metadata
STORE_PNG_IN_DB=true

# Activar automatización
ENABLE_PPI_WATCHER=true
ENABLE_PNG_UPLOADER=true

# Rutas para LGUAXX
PPI_DATA_PATH_LGUAXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
PNG_OUTPUT_PATH_LGUAXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

# Rutas para LOXX (si aplica)
PPI_DATA_PATH_LOXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS20\100km.ppi
PNG_OUTPUT_PATH_LOXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LOXX

# Python
PYTHON_CMD=python
```

## 🎯 Flujo Completo Automático

```
1. Nuevo archivo PPI aparece
   ↓
2. PPI Watcher lo detecta (automático)
   ↓
3. Ejecuta advanced_ppi_converter.py (automático)
   ↓
4. PNG convertido guardado en PNG_OUTPUT_PATH
   ↓
5. PNG Uploader lo detecta (automático)
   ↓
6. PNG subido a PostgreSQL (automático)
   ↓
7. ✅ Listo para usar en el visor
```

**Todo es automático. No necesitas hacer nada manualmente.**

## 🔍 Verificar que Funciona

### 1. Iniciar el servidor

```bash
cd backend
npm start
```

Deberías ver en los logs:

```
[auto-services] Iniciando monitoreo automático de PPI...
[auto-services] ✓ Monitoreo PPI iniciado para LGUAXX
[ppi-watcher] Monitoreo activo. Esperando nuevos archivos PPI...
[auto-services] Iniciando monitoreo automático de PNGs...
[auto-services] ✓ Monitoreo PNG iniciado para LGUAXX
[png-upload] Monitoreo activo. Esperando nuevos PNGs...
```

### 2. Probar con un archivo nuevo

1. Copia un archivo `.ppi` nuevo al directorio `PPI_DATA_PATH`
2. Observa los logs del servidor
3. Deberías ver:
   ```
   [ppi-watcher] Procesando nuevo archivo PPI: archivo.ppi
   [ppi-converter] ✓ archivo.ppi
   [ppi-watcher] ✓ Archivo procesado: archivo.ppi
   [png-upload] Procesando nuevo PNG: LGUAXX_archivo.png
   [png-upload] ✓ PNG subido a PostgreSQL: LGUAXX_archivo.png (ID: 123)
   ```

## ⚙️ Opciones Avanzadas

### Desactivar solo una parte

```env
# Solo conversión automática, sin subida automática
ENABLE_PPI_WATCHER=true
ENABLE_PNG_UPLOADER=false

# Solo subida automática, sin conversión automática
ENABLE_PPI_WATCHER=false
ENABLE_PNG_UPLOADER=true
```

### Configurar tiempos de espera

Los servicios tienen tiempos de espera (debounce) para evitar procesar archivos mientras se están escribiendo:

- **PPI Watcher**: 5 segundos (configurable en código)
- **PNG Uploader**: 3 segundos (configurable en código)

### Procesar archivos existentes

El PNG Uploader procesa automáticamente todos los PNGs existentes al iniciar (si `processExisting = true`).

## ❓ Solución de Problemas

### El monitoreo no inicia

1. Verifica que las rutas en `.env` sean correctas
2. Verifica que los directorios existan
3. Revisa los logs del servidor para errores

### Los PNGs no se suben a PostgreSQL

1. Verifica que `STORE_PNG_IN_DB=true` esté en `.env`
2. Verifica la conexión a PostgreSQL
3. Revisa los logs para errores específicos

### El conversor no se ejecuta

1. Verifica que `PYTHON_CMD` apunte al Python correcto
2. Verifica que `advanced_ppi_converter.py` exista en `scripts/`
3. Verifica que todas las dependencias de Python estén instaladas

## 📊 Resumen

✅ **Configura `.env`** con las rutas y activa los servicios
✅ **Inicia el servidor** con `npm start`
✅ **¡Listo!** Todo funciona automáticamente:
   - Nuevos PPI → Se convierten automáticamente
   - Nuevos PNG → Se suben a PostgreSQL automáticamente

**No necesitas ejecutar comandos manualmente. Todo es automático.**

