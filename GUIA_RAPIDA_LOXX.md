# 🚀 Guía Rápida: Ejecutar LOXX en PC Remota y Sincronizar con Base de Datos Local

## 📋 Resumen del Flujo

```
PC REMOTA:
  1. Ejecutar script en modo watch
  2. Script procesa H5 → PNG automáticamente
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
pip install watchdog
```

### 1.2 Copiar archivos a la PC remota

Copia estos archivos a la PC remota (por ejemplo, en `C:\LOXX\scripts\`):

- `process_loxx_h5_compressed.py`
- `iniciar_h5_watcher.bat` (opcional, pero recomendado)

### 1.3 Configurar rutas (si es necesario)

Edita `iniciar_h5_watcher.bat` y ajusta las rutas si son diferentes:

```batch
set INPUT_DIR=F:\LOXX\H5          ← Directorio donde llegan los archivos .h5.gz
set OUTPUT_DIR=F:\LOXX\PNG_OUTPUT ← Directorio donde se guardan los PNGs
```

### 1.4 Ejecutar los servicios (IMPORTANTE: Necesitas 2 servicios)

**⚠️ IMPORTANTE:** Debes ejecutar DOS servicios en la PC remota:

#### Servicio 1: Procesador de H5 (genera PNGs)

**Opción A: Usar el script batch (MÁS FÁCIL)**
```bash
iniciar_h5_watcher.bat
```

**Opción B: Usar Python directamente**
```bash
cd C:\LOXX\scripts
python process_loxx_h5_compressed.py --watch --input-dir "F:\LOXX\H5" --output-dir "F:\LOXX\PNG_OUTPUT" --radar-id LOXX
```

#### Servicio 2: Servidor HTTP (sirve PNGs vía HTTP) ⚠️ ESTE FALTA

**Opción A: Usar el script batch**
```bash
start_loxx_server.bat
```

**Opción B: Usar Python directamente**
```bash
cd C:\LOXX\scripts
python radar_server_loxx.py --data-path "F:\LOXX\PNG_OUTPUT" --port 8080
```

**⚠️ CRÍTICO:** Ambos servicios deben estar corriendo al mismo tiempo:
- **Ventana 1:** `iniciar_h5_watcher.bat` (procesa H5 → PNG)
- **Ventana 2:** `start_loxx_server.bat` (sirve PNGs vía HTTP)

### 1.5 Verificar que ambos servicios funcionan

**Servicio 1 (Procesador H5):** Deberías ver algo como:

```
============================================================
PROCESANDO ARCHIVOS EXISTENTES
============================================================
Buscando archivos H5 comprimidos en: F:\LOXX\H5
Encontrados X archivos H5 comprimidos para procesar
Procesando archivos existentes...

✓ Procesado exitosamente: archivo1.h5.gz -> LOXX_20250718_000000.png
...

============================================================
INICIANDO MONITOREO DE NUEVOS ARCHIVOS
============================================================
MODO MONITOREO ACTIVO
============================================================
Esperando nuevos archivos H5 comprimidos...
Presiona Ctrl+C para detener
============================================================
```

**¡IMPORTANTE!** Deja esta ventana abierta. El servicio debe estar corriendo constantemente.

### 1.6 Verificar que los PNGs se están generando

Revisa que en `F:\LOXX\PNG_OUTPUT` se estén creando carpetas por fecha con los PNGs:

```
F:\LOXX\PNG_OUTPUT\
  └─ 2025-07-18\
      ├─ LOXX_20250718_000000.png
      ├─ LOXX_20250718_001000.png
      └─ ...
```

### 1.8 Verificar desde PC local que el servidor es accesible

Desde tu PC local, prueba acceder al servidor remoto:
```bash
# Reemplaza [IP_PC_REMOTA] con la IP real (ej: 100.100.81.47)
curl http://[IP_PC_REMOTA]:8080/api/radar/index
```

Si funciona, verás un JSON. Si no funciona:
- Verifica que Tailscale esté conectado en ambas PCs
- Verifica que el firewall de Windows permita el puerto 8080
- Verifica que la IP sea correcta

---

## 🔧 PASO 2: En PC LOCAL

### 2.1 Configurar variables de entorno

Edita el archivo `backend/.env` y agrega/verifica estas variables:

```env
# ============================================
# SINCRONIZACIÓN AUTOMÁTICA PNG (PC LOCAL)
# ============================================

# Activar sincronización automática desde PC remota
ENABLE_PNG_SYNC=true

# Intervalo de sincronización en milisegundos
# 300000 = 5 minutos (recomendado)
# 60000 = 1 minuto (más rápido, pero más carga)
PNG_SYNC_INTERVAL=300000

# ============================================
# CONFIGURACIÓN DE POSTGRESQL LOCAL
# ============================================

DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña_postgres
DB_NAME=radar_metadata

# Activar almacenamiento de PNGs en la base de datos
STORE_PNG_IN_DB=true

# ============================================
# URL DE LA PC REMOTA
# ============================================

# URL de la PC remota donde se sirven los PNGs
# IMPORTANTE: Reemplaza [IP_PC_REMOTA] con la IP real de tu PC remota
RADAR_LOXX_URL=http://[IP_PC_REMOTA]:8080
```

**Ejemplo:**
```env
RADAR_LOXX_URL=http://100.100.81.47:8080
```

### 2.2 Iniciar el servidor backend

En la PC local, abre PowerShell o CMD y ejecuta:

```bash
cd C:\Users\Usuario iTC\Desktop\TesisUTPL\backend
npm start
```

### 2.3 Verificar que la sincronización está activa

Deberías ver en los logs:

```
[auto-services] Iniciando sincronización automática de PNGs desde PC remota...
[auto-services] ✓ Sincronización PNG iniciada para LOXX (cada 300s)
```

### 2.4 Verificar que los PNGs se están sincronizando

Cada 5 minutos (o el intervalo configurado), deberías ver en los logs:

```
[png-sync] Sincronizando PNGs para LOXX...
[png-sync] Descargando PNG: LOXX_20250718_000000.png (2025-07-18)
[png-sync] ✓ PNG sincronizado: LOXX_20250718_000000.png (ID: 123)
```

---

## 🎯 PASO 3: Verificar el Flujo Completo

### 3.1 Prueba manual

1. **En PC REMOTA:** Coloca un archivo `.h5.gz` nuevo en `F:\LOXX\H5`
2. **Espera:** El script debería detectarlo y procesarlo (verás el mensaje `[watch] Procesando...`)
3. **Verifica PNG:** Revisa que se generó el PNG en `F:\LOXX\PNG_OUTPUT\[fecha]\`
4. **En PC LOCAL:** Espera máximo 5 minutos
5. **Verifica logs:** Deberías ver `[png-sync] ✓ PNG sincronizado...`
6. **Verifica base de datos:** Consulta PostgreSQL para verificar que el PNG está guardado

### 3.2 Verificar en el visor

1. Abre el visor en tu navegador
2. Activa el toggle de LOXX
3. Debería cargar automáticamente la última imagen del día actual
4. Si no hay imágenes del día actual, verás un mensaje en la consola del navegador (F12)

---

## 🔍 Verificación y Debugging

### Verificar que el servicio está corriendo (PC REMOTA)

```bash
# Ver procesos Python
tasklist | findstr python

# Deberías ver algo como:
# python.exe    12345 Console     1    123,456 K
```

### Verificar sincronización (PC LOCAL)

Revisa los logs del servidor backend. Deberías ver:

```
[png-sync] Sincronizando PNGs para LOXX...
[png-sync] Consultando índice remoto...
[png-sync] Encontrados X PNGs nuevos
[png-sync] Descargando PNG: LOXX_20250718_000000.png
[png-sync] ✓ PNG sincronizado: LOXX_20250718_000000.png (ID: 123)
```

### Verificar en PostgreSQL (PC LOCAL)

Conecta a PostgreSQL y ejecuta:

```sql
SELECT 
    id, 
    filename, 
    radar_id, 
    source_timestamp,
    created_at
FROM radar_products 
WHERE radar_id = 'LOXX' 
ORDER BY source_timestamp DESC 
LIMIT 10;
```

Deberías ver los PNGs recientes sincronizados.

---

## ⚙️ Configuración Avanzada

### Cambiar intervalo de sincronización

En `backend/.env`:

```env
# Sincronizar cada 1 minuto (más rápido)
PNG_SYNC_INTERVAL=60000

# Sincronizar cada 10 minutos (más lento)
PNG_SYNC_INTERVAL=600000
```

### Ejecutar el servicio en segundo plano (PC REMOTA)

**Opción A: Usar `start` en Windows**
```batch
start /B iniciar_h5_watcher.bat
```

**Opción B: Usar PowerShell**
```powershell
Start-Process -FilePath "python" -ArgumentList "process_loxx_h5_compressed.py --watch --input-dir F:\LOXX\H5 --output-dir F:\LOXX\PNG_OUTPUT" -WindowStyle Hidden
```

**Opción C: Usar NSSM (Non-Sucking Service Manager)**
Descarga NSSM y crea un servicio de Windows:
```bash
nssm install LOXX_H5_Watcher "C:\Python\python.exe" "C:\LOXX\scripts\process_loxx_h5_compressed.py --watch --input-dir F:\LOXX\H5 --output-dir F:\LOXX\PNG_OUTPUT"
nssm start LOXX_H5_Watcher
```

---

## 🐛 Solución de Problemas

### El servicio no detecta archivos nuevos (PC REMOTA)

1. Verifica que el servicio esté corriendo
2. Verifica que el directorio `F:\LOXX\H5` existe
3. Verifica permisos de lectura en el directorio
4. Revisa los logs del script

### Los PNGs no se sincronizan (PC LOCAL)

1. **Verifica `ENABLE_PNG_SYNC=true`** en `backend/.env`
2. **Verifica la URL de la PC remota:**
   ```env
   RADAR_LOXX_URL=http://[IP_CORRECTA]:8080
   ```
3. **Verifica que el servidor HTTP en PC remota esté funcionando:**
   - Abre en el navegador: `http://[IP_PC_REMOTA]:8080/converted_images/LOXX/`
   - Deberías ver un listado de carpetas por fecha
4. **Revisa los logs del servidor backend** para ver errores
5. **Verifica conectividad de red** entre PC local y PC remota

### El visor no carga la última imagen

1. Verifica que haya imágenes procesadas para el día actual
2. Abre la consola del navegador (F12) para ver errores
3. Verifica que el endpoint funcione:
   ```
   http://localhost:3000/api/radar/LOXX/pngs/latest-today
   ```

---

## 📝 Checklist Final

**PC REMOTA:**
- [ ] `watchdog` instalado (`pip install watchdog`)
- [ ] `process_loxx_h5_compressed.py` copiado
- [ ] `iniciar_h5_watcher.bat` configurado con rutas correctas
- [ ] Servicio ejecutándose (`iniciar_h5_watcher.bat`)
- [ ] PNGs generándose en `F:\LOXX\PNG_OUTPUT`
- [ ] Servidor HTTP sirviendo PNGs en puerto 8080

**PC LOCAL:**
- [ ] `ENABLE_PNG_SYNC=true` en `backend/.env`
- [ ] `RADAR_LOXX_URL` configurado con IP correcta de PC remota
- [ ] `STORE_PNG_IN_DB=true` en `backend/.env`
- [ ] PostgreSQL configurado y funcionando
- [ ] Servidor backend ejecutándose (`npm start`)
- [ ] Logs muestran sincronización activa

**Verificación:**
- [ ] PNGs aparecen en PostgreSQL
- [ ] Visor carga automáticamente última imagen del día
- [ ] Nuevos archivos H5 se procesan automáticamente
- [ ] PNGs se sincronizan automáticamente cada 5 minutos

---

## 🎉 ¡Listo!

Una vez configurado, **todo es automático**:

1. ✅ Archivo H5 llega a PC remota → Se procesa automáticamente
2. ✅ PNG generado → Se sirve vía HTTP
3. ✅ PC local sincroniza → Descarga PNG automáticamente
4. ✅ PNG guardado en PostgreSQL → Disponible en el visor
5. ✅ Visor carga → Muestra última imagen automáticamente

**No necesitas hacer nada manual después de la configuración inicial.**

