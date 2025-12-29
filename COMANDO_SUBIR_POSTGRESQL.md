# 📤 Comando Completo para Subir a PostgreSQL

## 🚀 Comando Completo

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

---

## 📝 Variables que Faltan en .env

Si prefieres usar variables de entorno, crea o edita el archivo `.env` en la PC remota:

```env
# ============================================
# CONFIGURACIÓN DE POSTGRESQL
# ============================================

# IP de tu PC LOCAL (donde está PostgreSQL)
DB_HOST=192.168.1.100

# Puerto de PostgreSQL (por defecto: 5432)
DB_PORT=5432

# Usuario de PostgreSQL
DB_USER=postgres

# Password de PostgreSQL
DB_PASSWORD=tu_password

# Nombre de la base de datos
DB_NAME=radar_metadata

# ============================================
# OPCIONAL: URL completa (alternativa)
# ============================================
# DATABASE_URL=postgres://postgres:tu_password@192.168.1.100:5432/radar_metadata
```

---

## 🔧 Usando Variables de Entorno

Si configuraste el `.env`, puedes usar el comando más simple:

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX
```

El conversor leerá automáticamente las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` del `.env`.

---

## 📋 Parámetros Explicados

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `--data-path` | Ruta donde están los archivos PPI | `D:\...\100km.ppi` |
| `--output-path` | Ruta donde se guardan los PNGs | `D:\...\converted_images\LGUAXX` |
| `--radar-id` | ID del radar | `LGUAXX` o `LOXX` |
| `--db-host` | **IP de tu PC LOCAL** (donde está PostgreSQL) | `192.168.1.100` |
| `--db-port` | Puerto de PostgreSQL | `5432` |
| `--db-user` | Usuario de PostgreSQL | `postgres` |
| `--db-password` | **Password de PostgreSQL** | `tu_password` |
| `--db-name` | Nombre de la base de datos | `radar_metadata` |

---

## 🔍 Cómo Obtener la IP de tu PC Local

En tu **PC LOCAL**, ejecuta:

```bash
ipconfig
```

Busca la dirección **IPv4**. Ejemplos:
- Red local: `192.168.1.100`
- Tailscale/VPN: `100.x.x.x`

---

## ✅ Ejemplo Completo con Valores Reales

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-host 192.168.1.100 \
    --db-port 5432 \
    --db-user postgres \
    --db-password miPassword123 \
    --db-name radar_metadata
```

**Reemplaza:**
- `192.168.1.100` → IP de tu PC local
- `miPassword123` → Tu password de PostgreSQL
- Las rutas por tus rutas reales

---

## 🔄 Alternativa: Usar URL Completa

En lugar de parámetros individuales, puedes usar una URL completa:

```bash
python advanced_ppi_converter.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" \
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --radar-id LGUAXX \
    --db-url "postgres://postgres:tu_password@192.168.1.100:5432/radar_metadata"
```

**Formato de la URL:**
```
postgres://usuario:password@host:puerto/nombre_base_datos
```

---

## 🧪 Probar Conexión Antes de Convertir

Antes de ejecutar el conversor, prueba la conexión:

```bash
python -c "import psycopg; conn = psycopg.connect('postgres://postgres:tu_password@192.168.1.100:5432/radar_metadata'); print('✓ Conexión exitosa'); conn.close()"
```

Si ves `✓ Conexión exitosa`, la configuración es correcta.

---

## 📝 Para el Servicio Automático (iniciar_servicio_ppi.bat)

Si usas el servicio automático, configura el `.bat` así:

```batch
@echo off
REM Configuración
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

REM PostgreSQL - IP de tu PC LOCAL
set DB_HOST=192.168.1.100
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=tu_password
set DB_NAME=radar_metadata

REM Ejecutar servicio
python ppi_auto_converter_service.py ^
    --data-path "%PPI_DATA_PATH%" ^
    --output-path "%PNG_OUTPUT_PATH%" ^
    --radar-id %RADAR_ID% ^
    --db-host %DB_HOST% ^
    --db-port %DB_PORT% ^
    --db-user %DB_USER% ^
    --db-password %DB_PASSWORD% ^
    --db-name %DB_NAME%
```

---

## ✅ Verificar que Funcionó

Después de ejecutar el comando, verifica en PostgreSQL:

```sql
-- Conectar a PostgreSQL
psql -U postgres -d radar_metadata

-- Ver los últimos PNGs subidos
SELECT id, filename, source_timestamp, created_at 
FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX'
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🆘 Troubleshooting

### Error: "No se puede conectar a PostgreSQL"

1. **Verifica la IP**: Asegúrate de usar la IP correcta de tu PC local
2. **Verifica PostgreSQL**: Asegúrate de que PostgreSQL está corriendo
3. **Verifica firewall**: El puerto 5432 debe estar abierto
4. **Verifica configuración**: Revisa `postgresql.conf` y `pg_hba.conf`

### Error: "Password incorrecto"

- Verifica que `--db-password` es correcto
- Prueba conectarte desde la PC local primero

### Error: "Database does not exist"

- Crea la base de datos: `CREATE DATABASE radar_metadata;`
- Ejecuta el esquema: `psql -U postgres -d radar_metadata -f schema.sql`

---

*Última actualización: Comando completo para subir a PostgreSQL*


