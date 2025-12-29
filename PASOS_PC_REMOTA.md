# 🖥️ Pasos para Levantar Servicios en la PC Remota

## ✅ Confirmación: ¿Qué se debe levantar en la PC Remota?

**SÍ, en la PC remota debes levantar un servicio Python que:**

1. **Monitorea** archivos PPI nuevos automáticamente
2. **Convierte** PPI → PNG automáticamente  
3. **Sube** los PNGs a PostgreSQL automáticamente

**Todo es automático. Solo necesitas iniciar el servicio una vez.**

---

## 🚀 Opción 1: Servicio Automático + PostgreSQL (Recomendado)

Este es el método más moderno y recomendado. El servicio monitorea, convierte y sube todo automáticamente a PostgreSQL.

**Ventajas:**
- ✅ Datos centralizados en PostgreSQL
- ✅ Más rápido (no necesita descargar desde PC remota cada vez)
- ✅ Más confiable (datos locales)
- ✅ Permite búsquedas y filtros avanzados

---

## 🌐 Opción 2: Servidor HTTP (radar_server.py) - Alternativa

Si prefieres servir las imágenes directamente desde la PC remota sin usar PostgreSQL, puedes usar `radar_server.py`.

**Cuándo usar:**
- Si no quieres usar PostgreSQL
- Si prefieres servir archivos directamente desde la PC remota
- Si la PC local puede acceder directamente a la PC remota

### Pasos para usar radar_server.py:

1. **Convertir archivos PPI a PNG** (una vez o periódicamente):
   ```bash
   python advanced_ppi_converter.py \
       --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
       --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
       --radar-id LGUAXX
   ```

2. **Iniciar el servidor HTTP**:
   ```bash
   python radar_server.py \
       --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
       --port 8080
   ```

   O usar el script batch:
   ```bash
   start_radar_server.bat
   ```

3. **Verificar que funciona**:
   - Abrir en navegador: `http://localhost:8080/api/radar/index`
   - Debería mostrar un JSON con la lista de archivos

**Endpoints del servidor:**
- `http://IP:8080/api/radar/index` - Lista de archivos
- `http://IP:8080/api/radar/latest` - Última imagen
- `http://IP:8080/api/radar/image/<filename>` - Imagen específica

**Nota:** La PC local puede consumir estos datos mediante el endpoint `/api/radar/:radarId/remote-index` del backend.

---

## 🚀 Opción 1: Servicio Automático + PostgreSQL (Recomendado)

Este es el método más moderno y recomendado. El servicio monitorea, convierte y sube todo automáticamente a PostgreSQL.

### Paso 1: Instalar Dependencias

```bash
pip install watchdog psycopg[binary]
```

O instalar todo de una vez:
```bash
pip install -r requirements_pc_remota.txt
```

### Paso 2: Configurar el Script Batch

Edita el archivo `iniciar_servicio_ppi.bat` y ajusta estas variables:

```batch
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

REM Configuración de PostgreSQL (debe ser accesible desde la PC remota)
set DB_HOST=100.124.134.19
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=byronPost
set DB_NAME=radar_metadata
```

### Paso 3: Ejecutar el Servicio

```bash
iniciar_servicio_ppi.bat
```

O directamente con Python:

```bash
python ppi_auto_converter_service.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-host 100.124.134.19 \
    --db-port 5432 \
    --db-user postgres \
    --db-password byronPost \
    --db-name radar_metadata
```

### Paso 4: Verificar que Funciona

Deberías ver en la consola:

```
============================================================
SERVICIO AUTOMÁTICO DE CONVERSIÓN PPI → PNG
============================================================
[service] Monitoreo iniciado. Esperando nuevos archivos PPI...
```

Cuando aparezca un archivo PPI nuevo:
```
[watcher] Procesando nuevo archivo PPI: archivo.ppi
✓ archivo.ppi
↪ Registrado en Postgres LGUAXX_archivo.png
[watcher] ✓ Archivo procesado: archivo.ppi
```

---

## 🌐 Opción 2: Servidor HTTP (Alternativa)

Si prefieres usar un servidor HTTP que sirva las imágenes directamente (sin PostgreSQL), puedes usar:

### Paso 1: Convertir Archivos PPI a PNG

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX
```

### Paso 2: Iniciar el Servidor HTTP

```bash
python radar_server.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --port 8080
```

### Paso 3: Verificar

Abrir en navegador: `http://localhost:8080/api/radar/index`

---

## 📋 Resumen de Archivos Necesarios en PC Remota

Asegúrate de tener estos archivos en la PC remota:

### Archivos Python:
- ✅ `ppi_auto_converter_service.py` - Servicio automático (Opción 1)
- ✅ `advanced_ppi_converter.py` - Conversor PPI a PNG
- ✅ `radar_server.py` - Servidor HTTP (Opción 2, opcional)

### Scripts Batch (Windows):
- ✅ `iniciar_servicio_ppi.bat` - Inicia el servicio automático

### Dependencias:
- ✅ Python 3.7+
- ✅ watchdog (para monitoreo de archivos)
- ✅ psycopg (para PostgreSQL)
- ✅ numpy, Pillow (para conversión de imágenes)

---

## 🔧 Configuración de PostgreSQL

**IMPORTANTE**: La PC remota debe poder conectarse a PostgreSQL.

### Verificar Conexión:

```bash
# Probar conexión desde la PC remota
python -c "import psycopg; conn = psycopg.connect('postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata'); print('✓ Conexión exitosa')"
```

### Si PostgreSQL está en otra máquina:

1. **Verificar que PostgreSQL acepta conexiones remotas**:
   - Editar `postgresql.conf`: `listen_addresses = '*'`
   - Editar `pg_hba.conf`: Agregar regla para permitir conexiones desde la IP de la PC remota

2. **Verificar firewall**:
   - Puerto 5432 debe estar abierto
   - Permitir conexiones desde la IP de la PC remota

---

## 🎯 Flujo Completo del Sistema

### Opción 1: Con PostgreSQL (Recomendado)

```
┌─────────────────────────────────┐
│   PC REMOTA                     │
│                                 │
│  1. Archivos PPI nuevos         │
│     ↓                           │
│  2. ppi_auto_converter_service  │  ← ESTO SE LEVANTA EN PC REMOTA
│     (monitorea y convierte)     │
│     ↓                           │
│  3. Convierte PPI → PNG         │
│     ↓                           │
│  4. Sube PNG a PostgreSQL       │
│     (remota o local)            │
└─────────────────────────────────┘
              ↓
         PostgreSQL
              ↓
┌─────────────────────────────────┐
│   PC LOCAL                      │
│                                 │
│  1. Backend API (Express)       │  ← ESTO SE LEVANTA EN PC LOCAL
│     (consulta PostgreSQL)       │
│     ↓                           │
│  2. Frontend (React)            │  ← ESTO SE LEVANTA EN PC LOCAL
│     (consume API)               │
│     ↓                           │
│  3. Visor Web                   │
│     (muestra imágenes)          │
└─────────────────────────────────┘
```

### Opción 2: Con Servidor HTTP (radar_server.py)

```
┌─────────────────────────────────┐
│   PC REMOTA                     │
│                                 │
│  1. Archivos PPI nuevos         │
│     ↓                           │
│  2. advanced_ppi_converter      │  ← Convierte manualmente
│     (convierte PPI → PNG)       │
│     ↓                           │
│  3. radar_server.py             │  ← ESTO SE LEVANTA EN PC REMOTA
│     (sirve PNGs por HTTP)       │
│     Puerto 8080                  │
└─────────────────────────────────┘
              ↓
         HTTP (puerto 8080)
              ↓
┌─────────────────────────────────┐
│   PC LOCAL                      │
│                                 │
│  1. Backend API (Express)       │  ← ESTO SE LEVANTA EN PC LOCAL
│     (consulta radar_server.py)  │
│     (endpoint: /remote-index)   │
│     ↓                           │
│  2. Frontend (React)            │  ← ESTO SE LEVANTA EN PC LOCAL
│     (consume API)               │
│     ↓                           │
│  3. Visor Web                   │
│     (muestra imágenes)          │
└─────────────────────────────────┘
```

---

## ✅ Checklist para PC Remota

### Si usas Opción 1 (PostgreSQL):

- [ ] Python 3.7+ instalado
- [ ] Dependencias instaladas (`watchdog`, `psycopg`, `numpy`, `Pillow`)
- [ ] Archivos copiados a la PC remota:
  - [ ] `ppi_auto_converter_service.py`
  - [ ] `advanced_ppi_converter.py`
  - [ ] `iniciar_servicio_ppi.bat`
- [ ] Configuración ajustada en `iniciar_servicio_ppi.bat`:
  - [ ] Ruta de archivos PPI
  - [ ] Ruta de salida PNG
  - [ ] Credenciales de PostgreSQL
- [ ] Conexión a PostgreSQL verificada
- [ ] Servicio ejecutándose (`iniciar_servicio_ppi.bat`)

### Si usas Opción 2 (radar_server.py):

- [ ] Python 3.7+ instalado
- [ ] Dependencias instaladas (`numpy`, `Pillow`)
- [ ] Archivos copiados a la PC remota:
  - [ ] `radar_server.py`
  - [ ] `advanced_ppi_converter.py`
  - [ ] `start_radar_server.bat` (opcional)
- [ ] Archivos PPI convertidos a PNG
- [ ] Servidor HTTP ejecutándose (`radar_server.py` en puerto 8080)
- [ ] Firewall configurado para permitir conexiones al puerto 8080
- [ ] IP de la PC remota conocida por la PC local

---

## 🆘 Troubleshooting

### Error: "watchdog no está instalado"
```bash
pip install watchdog
```

### Error: "psycopg no está instalado"
```bash
pip install psycopg[binary]
```

### Error: "No se puede conectar a PostgreSQL"
- Verificar que PostgreSQL está corriendo
- Verificar IP, puerto, usuario y contraseña
- Verificar firewall y configuración de PostgreSQL para conexiones remotas

### Error: "advanced_ppi_converter no encontrado"
- Asegúrate de que `advanced_ppi_converter.py` está en el mismo directorio
- O ajusta la ruta en el script

### El servicio no detecta archivos nuevos
- Verificar que la ruta `PPI_DATA_PATH` es correcta
- Verificar permisos de lectura en el directorio
- Verificar que los archivos tienen extensión `.ppi`

---

## 📝 Notas Importantes

1. **El servicio debe correr continuamente** en la PC remota para detectar archivos nuevos
2. **No necesitas reiniciar** el servicio cada vez que hay un archivo nuevo
3. **El servicio es automático**: detecta, convierte y sube sin intervención
4. **PostgreSQL puede estar en la PC remota o en otra máquina** (debe ser accesible desde la red)

---

## 🔄 Automatización (Opcional)

Para que el servicio se inicie automáticamente al arrancar Windows:

1. Abrir "Programador de tareas" (Task Scheduler)
2. Crear tarea básica
3. Configurar:
   - **Trigger**: Al iniciar sesión
   - **Acción**: Iniciar programa
   - **Programa**: `python`
   - **Argumentos**: `C:\ruta\a\ppi_auto_converter_service.py --data-path "..." --output-path "..." --radar-id LGUAXX --db-host ...`
   - **Iniciar en**: Directorio donde está el script

---

*Última actualización: Basado en el código actual del proyecto*

