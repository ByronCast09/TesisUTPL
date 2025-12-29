# 🚀 Guía Rápida: Ejecutar GUAXX en PC Remota y Sincronizar con Base de Datos Local

## 📋 Resumen del Flujo

```
PC REMOTA:
  1. Ejecutar servicio PPI (monitorea y convierte .ppi → PNG)
  2. PNGs se guardan en directorio de salida
  3. PNGs se sirven vía HTTP (puerto 8080)

PC LOCAL:
  1. Servidor backend sincroniza PNGs cada 5 minutos
  2. PNGs se guardan en PostgreSQL local
  3. Visor carga automáticamente la última imagen
```

---

## 🔧 PASO 1: En PC REMOTA

### 1.1 Instalar dependencias

Abre PowerShell o CMD en la PC remota y ejecuta:

```bash
pip install watchdog psycopg[binary]
```

### 1.2 Copiar archivos a la PC remota

Copia estos archivos a la PC remota (por ejemplo, en `C:\GUAXX\scripts\`):

- `ppi_auto_converter_service.py`
- `advanced_ppi_converter.py` (o `advanced_ppi_converter_standalone.py`)
- `radar_server.py`
- `iniciar_todos_guaxx.bat` (opcional, pero recomendado)

### 1.3 Configurar rutas

Edita `iniciar_todos_guaxx.bat` y ajusta las rutas según tu configuración:

```batch
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX
set PORT=8080

REM PostgreSQL (si el servicio PPI sube directamente a PostgreSQL)
set DB_HOST=100.124.134.19
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=byronPost
set DB_NAME=radar_metadata
```

### 1.4 Ejecutar los servicios (IMPORTANTE: Necesitas 2 servicios)

**⚠️ IMPORTANTE:** Debes ejecutar DOS servicios en la PC remota:

#### Opción A: Usar el script batch (MÁS FÁCIL) ⭐ RECOMENDADO

```bash
iniciar_todos_guaxx.bat
```

Este script iniciará ambos servicios automáticamente en ventanas separadas.

#### Opción B: Ejecutar manualmente

**Servicio 1: Procesador PPI (genera PNGs y los sube a PostgreSQL)**

```bash
python ppi_auto_converter_service.py ^
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" ^
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" ^
    --radar-id LGUAXX ^
    --db-host 100.124.134.19 ^
    --db-port 5432 ^
    --db-user postgres ^
    --db-password byronPost ^
    --db-name radar_metadata
```

**Servicio 2: Servidor HTTP (sirve PNGs vía HTTP)**

```bash
python radar_server.py --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" --port 8080
```

**⚠️ CRÍTICO:** Ambos servicios deben estar corriendo al mismo tiempo:
- **Ventana 1:** Procesador PPI (procesa PPI → PNG y sube a PostgreSQL)
- **Ventana 2:** Servidor HTTP (sirve PNGs vía HTTP para sincronización)

---

## 🔧 PASO 2: En PC LOCAL

### 2.1 Configurar URL remota en `.env`

Asegúrate de tener configurado en `tesis_utpl/backend/.env`:

```env
# Radar GUAXX (PC remota GUAXX)
RADAR_LGUAXX_URL=http://100.124.134.19:8080

# Si también tienes LOXX configurado
RADAR_LOXX_URL=http://100.100.81.47:8080
```

**Nota:** Reemplaza `100.124.134.19` con la IP real de tu PC remota GUAXX (puede ser Tailscale o IP local).

### 2.2 Verificar firewall en PC remota

Asegúrate de que el puerto 8080 esté abierto en el firewall de la PC remota:

```powershell
# En la PC remota, ejecuta como Administrador:
netsh advfirewall firewall add rule name="GUAXX HTTP Server" dir=in action=allow protocol=TCP localport=8080
```

### 2.3 Iniciar servidor backend local

```bash
cd tesis_utpl/backend
npm start
```

El servicio `PNGSyncService` se iniciará automáticamente y sincronizará PNGs cada 5 minutos.

---

## ✅ Verificación

### 1. Verificar que el servidor HTTP funciona (desde PC remota)

Abre un navegador en la PC remota y visita:
```
http://localhost:8080/api/radar/index
```

Deberías ver un JSON con las fechas y archivos disponibles.

### 2. Verificar desde PC local

Abre un navegador en la PC local y visita:
```
http://100.124.134.19:8080/api/radar/index
```

O prueba con:
```
http://100.124.134.19:8080/index.json
```

### 3. Verificar sincronización

En los logs del servidor backend local, deberías ver:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] Consultando índice remoto desde: http://100.124.134.19:8080/index.json
✓ Índice remoto obtenido desde: http://100.124.134.19:8080/index.json (X fechas)
[png-sync] ✓ PNG sincronizado: LGUAXX_20250718_160000.png
```

### 4. Verificar en PostgreSQL

```sql
SELECT 
    radar_id,
    COUNT(*) as total,
    MAX(scan_time) as ultima_imagen
FROM radar_products
WHERE radar_id = 'LGUAXX' AND product_type = 'ppi_png'
GROUP BY radar_id;
```

---

## 🔄 Flujo Completo Automático

```
PC REMOTA GUAXX:
  1. Nuevo archivo .ppi aparece en el directorio monitoreado
      ↓ (detectado automáticamente por watchdog)
  2. ppi_auto_converter_service.py procesa el archivo
      ↓ (conversión automática PPI → PNG)
  3. PNG guardado en PNG_OUTPUT_PATH
      ↓ (subido automáticamente a PostgreSQL remoto)
  4. Servidor HTTP sirve PNGs en puerto 8080
      ↓
PC LOCAL:
  5. PNGSyncService consulta http://100.124.134.19:8080/index.json
      ↓ (cada 5 minutos)
  6. Descarga PNGs nuevos
      ↓
  7. Guarda en PostgreSQL local con radar_id = 'LGUAXX'
      ↓
VISOR:
  8. Carga automáticamente la última imagen del día actual
```

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

### Error: "connect ECONNREFUSED" desde PC local

- Verifica que el servidor HTTP esté corriendo en la PC remota
- Verifica que el puerto 8080 esté abierto en el firewall
- Verifica que la IP en `RADAR_LGUAXX_URL` sea correcta

### Error: "timeout exceeded"

- El servidor puede tardar en responder si hay muchos archivos
- Aumenta el timeout en `.env`: `RADAR_REMOTE_INDEX_TIMEOUT_MS=180000`

### Los PNGs no se sincronizan

- Verifica que `RADAR_LGUAXX_URL` esté configurado en `.env`
- Verifica los logs del backend para ver errores de sincronización
- Verifica que el servidor HTTP esté sirviendo correctamente los PNGs

---

## 📝 Resumen de Comandos

### En PC Remota:

```bash
# Iniciar ambos servicios (RECOMENDADO)
iniciar_todos_guaxx.bat

# O iniciar manualmente:
# Ventana 1: Procesador PPI
python ppi_auto_converter_service.py --data-path "..." --output-path "..." --radar-id LGUAXX --db-host ... --db-port ... --db-user ... --db-password ... --db-name ...

# Ventana 2: Servidor HTTP
python radar_server.py --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" --port 8080
```

### En PC Local:

```bash
# Configurar .env con RADAR_LGUAXX_URL
# Iniciar backend
cd tesis_utpl/backend
npm start
```

---

## ✅ Checklist

- [ ] Dependencias instaladas en PC remota (`watchdog`, `psycopg[binary]`)
- [ ] Rutas configuradas en `iniciar_todos_guaxx.bat`
- [ ] Servicio PPI corriendo en PC remota
- [ ] Servidor HTTP corriendo en PC remota (puerto 8080)
- [ ] Firewall configurado en PC remota (puerto 8080 abierto)
- [ ] `RADAR_LGUAXX_URL` configurado en `.env` de PC local
- [ ] Backend corriendo en PC local
- [ ] Sincronización funcionando (verificar logs)

---

**¡Todo listo! El sistema debería funcionar automáticamente.** 🎉

