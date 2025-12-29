# ⚡ Guía Rápida: PC Remota

## 🎯 ¿Qué hacer en la PC Remota?

Ejecutar un servicio Python que:
1. **Monitorea** archivos PPI nuevos
2. **Convierte** automáticamente a PNG
3. **Sube** automáticamente a PostgreSQL

---

## 📦 Instalación (Solo una vez)

```bash
pip install watchdog psycopg[binary]
```

O instalar todo:
```bash
pip install -r requirements_pc_remota.txt
```

---

## ⚙️ Configuración Rápida

### Opción 1: Editar el batch (Windows)

Edita `iniciar_servicio_ppi.bat`:

```batch
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX
set DB_HOST=100.124.134.19
set DB_USER=postgres
set DB_PASSWORD=byronPost
set DB_NAME=radar_metadata
```

### Opción 2: Comando directo

```bash
python ppi_auto_converter_service.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

---

## 🚀 Ejecutar

### Windows:
```bash
iniciar_servicio_ppi.bat
```

### Linux/Mac:
```bash
python3 ppi_auto_converter_service.py --data-path "..." --output-path "..." --radar-id LGUAXX --db-url "..."
```

---

## ✅ Verificar

Deberías ver:
```
============================================================
SERVICIO AUTOMÁTICO DE CONVERSIÓN PPI → PNG
============================================================
[service] Monitoreo iniciado. Esperando nuevos archivos PPI...
```

Cuando aparezca un PPI nuevo:
```
[watcher] Procesando nuevo archivo PPI: archivo.ppi
✓ archivo.ppi
↪ Registrado en Postgres LGUAXX_archivo.png
[watcher] ✓ Archivo procesado: archivo.ppi
```

---

## 📝 Resumen

1. ✅ Instala: `pip install watchdog psycopg[binary]`
2. ✅ Configura rutas en `iniciar_servicio_ppi.bat`
3. ✅ Ejecuta: `iniciar_servicio_ppi.bat`
4. ✅ **¡Listo!** Todo automático

**El servicio debe correr en la PC REMOTA donde están los archivos PPI.**

