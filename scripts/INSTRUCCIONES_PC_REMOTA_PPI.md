# 📋 Instrucciones: Automatización en PC Remota

Este servicio debe ejecutarse en la **PC REMOTA** donde están los archivos PPI y el script `advanced_ppi_converter.py`.

## 🎯 ¿Qué hace?

1. **Monitorea** el directorio de archivos PPI
2. **Detecta** nuevos archivos `.ppi` automáticamente
3. **Ejecuta** `advanced_ppi_converter.py` automáticamente
4. **Convierte** PPI a PNG
5. **Sube** los PNGs a PostgreSQL automáticamente

**Todo es automático. No necesitas ejecutar comandos manualmente.**

---

## 📦 Instalación en PC Remota

### 1. Instalar dependencias de Python

```bash
pip install watchdog psycopg[binary]
```

O si usas conda:
```bash
conda install watchdog psycopg
```

### 2. Verificar que tienes los archivos

Asegúrate de tener en la PC remota:
- ✅ `advanced_ppi_converter.py`
- ✅ `ppi_auto_converter_service.py` (el nuevo servicio)
- ✅ Todas las dependencias de `advanced_ppi_converter.py` (numpy, PIL, etc.)

---

## ⚙️ Configuración

### Opción 1: Usar el script batch (Windows)

Edita `iniciar_servicio_ppi.bat` y ajusta las rutas:

```batch
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

set DB_HOST=100.124.134.19
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=byronPost
set DB_NAME=radar_metadata
```

Luego ejecuta:
```bash
iniciar_servicio_ppi.bat
```

### Opción 2: Usar variables de entorno

Crea un archivo `.env` o configura variables de entorno:

```env
DB_HOST=100.124.134.19
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=byronPost
DB_NAME=radar_metadata
```

Luego ejecuta:
```bash
python ppi_auto_converter_service.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX
```

### Opción 3: Usar URL completa de PostgreSQL

```bash
python ppi_auto_converter_service.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

---

## 🚀 Ejecutar el Servicio

### En Windows:

```bash
# Opción 1: Usar el batch
iniciar_servicio_ppi.bat

# Opción 2: Ejecutar directamente
python ppi_auto_converter_service.py --data-path "..." --output-path "..." --radar-id LGUAXX --db-url "..."
```

### En Linux/Mac:

```bash
python3 ppi_auto_converter_service.py \
    --data-path "/ruta/a/ppi" \
    --output-path "/ruta/a/png" \
    --radar-id LGUAXX \
    --db-url "postgres://usuario:password@host:5432/dbname"
```

---

## 🔍 Verificar que Funciona

Cuando inicies el servicio, deberías ver:

```
============================================================
SERVICIO AUTOMÁTICO DE CONVERSIÓN PPI → PNG
============================================================
Radar: LGUAXX
Directorio PPI: D:\Rainview-Analyzer\...
Directorio PNG: D:\Rainview-Analyzer\...
PostgreSQL: 100.124.134.19
============================================================

[service] Monitoreo iniciado. Esperando nuevos archivos PPI...
[service] Presiona Ctrl+C para detener
```

Cuando aparezca un nuevo archivo PPI, verás:

```
[watcher] Procesando nuevo archivo PPI: archivo.ppi
✓ archivo.ppi
↪ Registrado en Postgres LGUAXX_archivo.png
[watcher] ✓ Archivo procesado: archivo.ppi
```

---

## 🔄 Ejecutar como Servicio de Windows (Opcional)

Para que el servicio se ejecute automáticamente al iniciar Windows:

### Opción 1: Usar Task Scheduler

1. Abre "Programador de tareas" (Task Scheduler)
2. Crea una tarea nueva
3. Configura:
   - **Trigger**: Al iniciar sesión
   - **Action**: Iniciar programa
   - **Programa**: `python.exe`
   - **Argumentos**: `ppi_auto_converter_service.py --data-path "..." --output-path "..." --radar-id LGUAXX --db-url "..."`
   - **Iniciar en**: Directorio donde está el script

### Opción 2: Usar NSSM (Non-Sucking Service Manager)

1. Descarga NSSM: https://nssm.cc/download
2. Instala el servicio:
   ```bash
   nssm install PPIAutoConverter "C:\Python\python.exe" "C:\ruta\ppi_auto_converter_service.py --data-path ... --output-path ..."
   ```
3. Inicia el servicio:
   ```bash
   nssm start PPIAutoConverter
   ```

---

## 📊 Flujo Automático

```
PC Remota:
  Nuevo archivo PPI aparece
      ↓ (detectado automáticamente por watchdog)
  Ejecuta advanced_ppi_converter.py
      ↓ (conversión automática)
  PNG guardado en PNG_OUTPUT_PATH
      ↓ (advanced_ppi_converter.py sube automáticamente)
  PNG subido a PostgreSQL
      ↓
  ✅ Listo
```

**Todo sucede en la PC remota automáticamente.**

---

## ❓ Solución de Problemas

### Error: "watchdog no está instalado"

```bash
pip install watchdog
```

### Error: "psycopg no está instalado"

```bash
pip install psycopg[binary]
```

### Error: "No se pudo importar advanced_ppi_converter"

- Verifica que `advanced_ppi_converter.py` esté en el mismo directorio
- O ajusta el `sys.path` en el script

### El servicio no detecta archivos nuevos

- Verifica que la ruta `--data-path` sea correcta
- Verifica que el directorio exista
- Verifica permisos de lectura

### Los PNGs no se suben a PostgreSQL

- Verifica la conexión a PostgreSQL
- Verifica las credenciales
- Revisa los logs del servicio

---

## ✅ Resumen

1. ✅ **Instala dependencias**: `pip install watchdog psycopg[binary]`
2. ✅ **Configura rutas** en `iniciar_servicio_ppi.bat` o como argumentos
3. ✅ **Ejecuta el servicio** en la PC remota
4. ✅ **¡Listo!** Todo funciona automáticamente

**El servicio debe correr en la PC REMOTA donde están los archivos PPI.**

---

## 🔗 Integración con PC Local

Si también quieres que el servicio en la PC local monitoree PNGs remotos:

1. En la PC remota: Ejecuta `ppi_auto_converter_service.py` (convierte y sube a PostgreSQL)
2. En la PC local: El servicio `pngUploadService.js` puede monitorear PNGs locales si los descargas

O simplemente deja que todo funcione en la PC remota y accede a los datos desde PostgreSQL.

