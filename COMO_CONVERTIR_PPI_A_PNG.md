# 🔄 Cómo Convertir PPI a PNG

Hay **dos formas** de convertir archivos PPI a PNG:

---

## 🚀 Opción 1: Conversión Automática (Recomendada)

El servicio monitorea y convierte automáticamente cuando aparecen archivos nuevos.

### Pasos:

1. **Instalar dependencias** (solo una vez):
   ```bash
   pip install watchdog psycopg[binary] numpy pillow
   ```

2. **Configurar** `iniciar_servicio_ppi.bat`:
   ```batch
   set RADAR_ID=LGUAXX
   set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
   set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX
   set DB_HOST=192.168.1.100    ← IP de tu PC local (donde está PostgreSQL)
   set DB_PORT=5432
   set DB_USER=postgres
   set DB_PASSWORD=tu_password
   set DB_NAME=radar_metadata
   ```

3. **Ejecutar el servicio**:
   ```bash
   iniciar_servicio_ppi.bat
   ```

**El servicio:**
- ✅ Monitorea automáticamente nuevos archivos PPI
- ✅ Convierte PPI → PNG automáticamente
- ✅ Sube PNGs a PostgreSQL automáticamente
- ✅ No necesitas hacer nada más

---

## 🔧 Opción 2: Conversión Manual

Si prefieres convertir manualmente (una vez o periódicamente):

### Comando Básico:

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX
```

### Con PostgreSQL (para subir a la base de datos):

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-host 192.168.1.100 \
    --db-port 5432 \
    --db-user postgres \
    --db-password tu_password \
    --db-name radar_metadata
```

### O usando URL completa de PostgreSQL:

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-url "postgres://postgres:tu_password@192.168.1.100:5432/radar_metadata"
```

---

## 📋 Parámetros del Conversor

### Parámetros Requeridos:

- `--data-path`: Ruta donde están los archivos PPI (puede tener carpetas por fecha: `YYYY-MM-DD/`)
- `--output-path`: Ruta donde se guardarán los PNGs convertidos
- `--radar-id`: ID del radar (LGUAXX, LOXX, etc.)

### Parámetros Opcionales (PostgreSQL):

- `--db-host`: IP o hostname de PostgreSQL
- `--db-port`: Puerto de PostgreSQL (default: 5432)
- `--db-user`: Usuario de PostgreSQL (default: postgres)
- `--db-password`: Password de PostgreSQL
- `--db-name`: Nombre de la base de datos
- `--db-url`: URL completa (alternativa a los parámetros individuales)

---

## 📁 Estructura de Directorios

### Estructura de Entrada (PPI):

El conversor espera archivos PPI organizados así:

```
PPI_DATA_PATH/
├── 2025-11-28/
│   ├── archivo1.ppi
│   ├── archivo2.ppi
│   └── ...
├── 2025-11-29/
│   └── ...
└── ...
```

O todos en la raíz:
```
PPI_DATA_PATH/
├── archivo1.ppi
├── archivo2.ppi
└── ...
```

### Estructura de Salida (PNG):

El conversor genera PNGs organizados por fecha:

```
PNG_OUTPUT_PATH/
├── 2025-11-28/
│   ├── LGUAXX_20251128_003002.png
│   ├── LGUAXX_20251128_002502.png
│   └── ...
├── 2025-11-29/
│   └── ...
└── index.json  (índice de archivos)
```

---

## ✅ Verificar Conversión

### Ver archivos convertidos:

```bash
# Ver PNGs generados
dir "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX\2025-11-28\*.png"
```

### Ver índice generado:

```bash
# Ver index.json
type "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX\index.json"
```

### Verificar en PostgreSQL:

```sql
-- Conectar a PostgreSQL
psql -U postgres -d radar_metadata

-- Ver PNGs convertidos
SELECT filename, source_timestamp, created_at 
FROM radar_products 
WHERE product_type = 'ppi_png' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔍 Ejemplos de Uso

### Ejemplo 1: Conversión simple (solo PNG, sin PostgreSQL)

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX
```

### Ejemplo 2: Conversión con PostgreSQL local

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-host localhost \
    --db-user postgres \
    --db-password miPassword \
    --db-name radar_metadata
```

### Ejemplo 3: Conversión con PostgreSQL remoto (PC local)

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-host 192.168.1.100 \
    --db-port 5432 \
    --db-user postgres \
    --db-password miPassword \
    --db-name radar_metadata
```

---

## 🆘 Troubleshooting

### Error: "No se pudo importar advanced_ppi_converter"

**Solución:**
- Asegúrate de estar en el directorio correcto
- Verifica que `advanced_ppi_converter.py` está en el mismo directorio

### Error: "No se encontraron archivos PPI"

**Solución:**
- Verifica que la ruta `--data-path` es correcta
- Verifica que hay archivos `.ppi` en esa ruta
- Verifica permisos de lectura

### Error: "No se puede conectar a PostgreSQL"

**Solución:**
- Verifica IP, puerto, usuario y password
- Verifica que PostgreSQL está corriendo
- Verifica firewall y configuración de PostgreSQL para conexiones remotas

### Error: "BLOB muy pequeño" o "No se pudo descomprimir"

**Solución:**
- El archivo PPI puede estar corrupto
- Intenta con otro archivo
- Verifica que el archivo no está vacío

---

## 📝 Resumen Rápido

### Conversión Automática:
```bash
iniciar_servicio_ppi.bat
```

### Conversión Manual:
```bash
python advanced_ppi_converter.py \
    --data-path "ruta/a/ppi" \
    --output-path "ruta/a/png" \
    --radar-id LGUAXX \
    --db-host IP_PC_LOCAL \
    --db-user postgres \
    --db-password password \
    --db-name radar_metadata
```

---

*Última actualización: Guía de conversión PPI a PNG*


