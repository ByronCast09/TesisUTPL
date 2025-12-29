# 📡 Configuración del Radar LOXX

Esta guía explica cómo configurar el procesamiento y sincronización del radar LOXX, similar al radar LGUAXX pero con archivos H5 comprimidos.

## 🎯 Información del Radar LOXX

- **Tailscale IPv4**: `100.100.81.47`
- **Tailscale IPv6**: `fd7a:115c:a1e0::f601:5132`
- **Ubicación datos PC Remota**: `F:\LOXX\H5`
- **Tipo de archivos**: Archivos comprimidos (.zip, .gz, .tar) que contienen archivos .h5

---

## 📁 Archivos por PC

### 🖥️ **PC REMOTA** (donde están los datos H5)

Los siguientes archivos deben estar en la **PC REMOTA**:

```
PC_REMOTA/
├── F:\LOXX\H5\              # Archivos comprimidos con .h5 (ya existe)
├── F:\LOXX\PNG_OUTPUT\      # Se crea automáticamente (PNGs convertidos)
│
└── scripts/                 # Copiar estos archivos desde tesis_utpl/scripts/
    ├── process_loxx_h5_compressed.py    # Procesa archivos comprimidos
    ├── radar_server_loxx.py              # Servidor HTTP para servir PNGs
    ├── convert_h5_to_png.py              # Utilidad de conversión (ya existe)
    ├── process_loxx_h5.bat               # Script batch para procesar
    └── start_loxx_server.bat             # Script batch para iniciar servidor
```

**Dependencias Python en PC Remota:**
```bash
pip install h5py numpy pillow matplotlib
```

---

### 💻 **PC LOCAL** (donde está el backend y PostgreSQL)

Los siguientes archivos ya están en la **PC LOCAL** (no necesitas copiar nada nuevo):

```
PC_LOCAL/
└── tesis_utpl/backend/
    ├── .env                    # Actualizar con URL de LOXX
    ├── services/
    │   ├── remoteRadarService.js   # Ya soporta LOXX
    │   └── pngDownloadService.js   # Ya soporta LOXX
    └── controllers/
        └── radarController.js     # Ya soporta LOXX
```

**Solo necesitas actualizar el archivo `.env`** con la URL del radar LOXX.

---

## 🚀 Pasos de Configuración

### **Paso 1: Configurar PC Remota**

1. **Copiar scripts a la PC remota:**
   - Copia estos archivos desde `tesis_utpl/scripts/` a la PC remota:
     - `process_loxx_h5_compressed.py`
     - `radar_server_loxx.py`
     - `convert_h5_to_png.py` (si no existe)
     - `process_loxx_h5.bat`
     - `start_loxx_server.bat`

2. **Instalar dependencias Python:**
   ```bash
   pip install h5py numpy pillow matplotlib
   ```

3. **Procesar archivos H5 comprimidos:**
   ```bash
   # Opción 1: Usar el script batch
   process_loxx_h5.bat
   
   # Opción 2: Usar Python directamente
   python process_loxx_h5_compressed.py ^
       --input-dir "F:\LOXX\H5" ^
       --output-dir "F:\LOXX\PNG_OUTPUT" ^
       --radar-id LOXX ^
       --recursive
   ```

   Esto convertirá todos los archivos .h5 comprimidos a PNG y los guardará en `F:\LOXX\PNG_OUTPUT`.

4. **Iniciar el servidor HTTP:**
   ```bash
   # Opción 1: Usar el script batch
   start_loxx_server.bat
   
   # Opción 2: Usar Python directamente
   python radar_server_loxx.py --data-path "F:\LOXX\PNG_OUTPUT" --port 8080
   ```

   El servidor estará disponible en:
   - `http://localhost:8080` (desde la PC remota)
   - `http://100.100.81.47:8080` (desde la PC local vía Tailscale)

5. **Verificar que funciona:**
   - Abre en navegador: `http://localhost:8080/api/radar/index`
   - Deberías ver un JSON con la lista de archivos PNG organizados por fecha

---

### **Paso 2: Configurar PC Local**

1. **Actualizar archivo `.env` en `tesis_utpl/backend/.env`:**

   Agrega o actualiza estas líneas:

   ```env
   # URL del radar LOXX (PC remota vía Tailscale)
   RADAR_LOXX_URL=http://100.100.81.47:8080
   
   # Si ya tienes LGUAXX configurado, mantén ambas:
   RADAR_LGUAXX_URL=http://[IP_LGUAXX]:8080
   RADAR_LOXX_URL=http://100.100.81.47:8080
   ```

2. **Verificar configuración:**
   ```bash
   cd tesis_utpl/backend
   node scripts/verificar_automatizacion.js
   ```

3. **Iniciar el servidor backend:**
   ```bash
   npm start
   ```

   El servidor automáticamente:
   - Se conectará a la PC remota de LOXX
   - Descargará PNGs nuevos
   - Los subirá a PostgreSQL local

---

## 🔄 Flujo Completo del Sistema

```
PC REMOTA (LOXX):
  F:\LOXX\H5\ (archivos comprimidos)
    ↓
  process_loxx_h5_compressed.py
    ↓
  F:\LOXX\PNG_OUTPUT\ (PNGs convertidos)
    ↓
  radar_server_loxx.py (servidor HTTP en puerto 8080)
    ↓
  http://100.100.81.47:8080/api/radar/index

PC LOCAL:
  Backend consulta http://100.100.81.47:8080
    ↓
  Descarga PNGs automáticamente
    ↓
  Sube a PostgreSQL local
    ↓
  Visor consulta PostgreSQL y muestra imágenes
```

---

## 📊 Endpoints Disponibles

### En PC Remota (LOXX):

- `http://100.100.81.47:8080/api/radar/index` - Índice de todos los PNGs
- `http://100.100.81.47:8080/api/radar/latest` - Última imagen PNG
- `http://100.100.81.47:8080/YYYY-MM-DD/filename.png` - Imagen específica

### En PC Local:

- `http://localhost:5000/api/radar/LOXX/pngs` - Lista de PNGs desde PostgreSQL
- `http://localhost:5000/api/radar/LOXX/pngs/viewer-index` - Índice para el visor

---

## ⚙️ Automatización

### En PC Remota:

Para procesar automáticamente nuevos archivos H5:

1. **Crear tarea programada en Windows:**
   - Ejecutar: `process_loxx_h5.bat`
   - Frecuencia: Cada hora o según necesites

2. **Mantener el servidor corriendo:**
   - El servidor `radar_server_loxx.py` debe estar siempre ejecutándose
   - Puedes configurarlo como servicio de Windows

### En PC Local:

La sincronización automática ya está configurada. El servidor backend:
- Consulta la PC remota cada 5 minutos (configurable)
- Descarga PNGs nuevos automáticamente
- Los sube a PostgreSQL

No necesitas hacer nada manualmente.

---

## 🔧 Solución de Problemas

### Error: "No se encontró archivo .h5 en archivo comprimido"

- Verifica que los archivos comprimidos contengan archivos .h5
- Algunos formatos pueden no ser compatibles (solo ZIP, GZIP, TAR)

### Error: "No se pudo conectar a PC remota"

1. Verifica que Tailscale esté conectado en ambas PCs
2. Verifica que el servidor esté corriendo en la PC remota:
   ```bash
   curl http://100.100.81.47:8080/api/radar/index
   ```
3. Verifica el firewall de Windows en la PC remota

### Los PNGs no se descargan automáticamente

1. Verifica que `RADAR_LOXX_URL` esté configurado en `.env`
2. Verifica los logs del servidor backend
3. Ejecuta manualmente:
   ```bash
   curl -X POST http://localhost:5000/api/radar/LOXX/download-pngs/recent?days=1
   ```

### Error al procesar archivos comprimidos

- Verifica que las dependencias estén instaladas:
  ```bash
  pip install h5py numpy pillow matplotlib
  ```
- Verifica que los archivos no estén corruptos
- Algunos archivos pueden requerir descompresión manual

---

## 📝 Notas Importantes

1. **No se descomprimen los archivos**: El script lee los .h5 directamente desde los archivos comprimidos en memoria, sin descomprimir en disco.

2. **Estructura de salida**: Los PNGs se organizan por fecha automáticamente:
   ```
   F:\LOXX\PNG_OUTPUT\
   ├── 2025-01-24\
   │   ├── LOXX_20250124_120000.png
   │   └── LOXX_20250124_120000.json
   └── 2025-01-25\
       └── ...
   ```

3. **Mismo proceso que LGUAXX**: El flujo es idéntico al radar LGUAXX, solo cambia:
   - La ubicación de los datos (F:\LOXX\H5)
   - El tipo de archivos (comprimidos con .h5)
   - La IP de Tailscale (100.100.81.47)

4. **Servidor debe estar siempre corriendo**: El servidor HTTP en la PC remota debe estar activo para que la PC local pueda descargar los PNGs.

---

## ✅ Checklist de Configuración

### PC Remota:
- [ ] Scripts copiados a la PC remota
- [ ] Dependencias Python instaladas
- [ ] Archivos H5 procesados a PNG
- [ ] Servidor HTTP iniciado y funcionando
- [ ] Verificado acceso desde PC local

### PC Local:
- [ ] `.env` actualizado con `RADAR_LOXX_URL`
- [ ] Servidor backend iniciado
- [ ] Verificado descarga automática de PNGs
- [ ] Verificado subida a PostgreSQL

---

## 🎉 ¡Listo!

Una vez configurado, el sistema funcionará automáticamente:
- Los archivos H5 comprimidos se convierten a PNG en la PC remota
- Los PNGs se descargan automáticamente a la PC local
- Se suben a PostgreSQL automáticamente
- El visor muestra las imágenes automáticamente

**No necesitas hacer nada manualmente después de la configuración inicial.**

