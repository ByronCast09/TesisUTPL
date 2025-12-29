# 📦 Archivos por PC - Radar LOXX

Este documento lista exactamente qué archivos deben ir en cada PC para configurar el radar LOXX.

---

## 🖥️ **PC REMOTA** (donde están los datos H5)

### Ubicación de los datos:
- **Datos originales**: `F:\LOXX\H5\` (ya existe, contiene archivos comprimidos con .h5)
- **PNGs convertidos**: `F:\LOXX\PNG_OUTPUT\` (se crea automáticamente)

### Archivos a copiar:

Copia estos archivos desde `tesis_utpl/scripts/` a la PC remota (puedes crear una carpeta `scripts` en la PC remota):

```
PC_REMOTA/
└── scripts/                    # Crear esta carpeta
    ├── process_loxx_h5_compressed.py    ⭐ NUEVO - Procesa archivos comprimidos
    ├── radar_server_loxx.py              ⭐ NUEVO - Servidor HTTP para LOXX
    ├── convert_h5_to_png.py              📋 YA EXISTE - Utilidad de conversión
    ├── process_loxx_h5.bat               ⭐ NUEVO - Script batch para procesar
    └── start_loxx_server.bat              ⭐ NUEVO - Script batch para iniciar servidor
```

### Dependencias Python a instalar:

```bash
pip install h5py numpy pillow matplotlib
```

### Comandos a ejecutar en PC Remota:

1. **Procesar archivos H5 comprimidos:**
   ```bash
   cd scripts
   process_loxx_h5.bat
   ```

2. **Iniciar servidor HTTP:**
   ```bash
   start_loxx_server.bat
   ```

---

## 💻 **PC LOCAL** (donde está el backend y PostgreSQL)

### Archivos que YA están en la PC local:

**NO necesitas copiar nada nuevo.** Los archivos ya están en tu proyecto:

```
PC_LOCAL/
└── tesis_utpl/
    ├── backend/
    │   ├── .env                    ⚙️ SOLO ACTUALIZAR ESTE ARCHIVO
    │   ├── services/
    │   │   ├── remoteRadarService.js   ✅ Ya soporta LOXX
    │   │   └── pngDownloadService.js   ✅ Ya soporta LOXX
    │   └── controllers/
    │       └── radarController.js      ✅ Ya soporta LOXX
    └── CONFIGURACION_LOXX.md           📖 Documentación completa
```

### Única acción requerida en PC Local:

**Actualizar el archivo `.env`** en `tesis_utpl/backend/.env`:

Agrega o actualiza esta línea:

```env
RADAR_LOXX_URL=http://100.100.81.47:8080
```

Si ya tienes LGUAXX configurado, tu `.env` debería verse así:

```env
# Radar LGUAXX
RADAR_LGUAXX_URL=http://[IP_LGUAXX]:8080

# Radar LOXX
RADAR_LOXX_URL=http://100.100.81.47:8080
```

### Comandos a ejecutar en PC Local:

1. **Verificar configuración:**
   ```bash
   cd tesis_utpl/backend
   node scripts/verificar_automatizacion.js
   ```

2. **Iniciar servidor backend:**
   ```bash
   npm start
   ```

   El servidor automáticamente:
   - Se conectará a la PC remota de LOXX
   - Descargará PNGs nuevos
   - Los subirá a PostgreSQL

---

## 📋 Resumen Rápido

### PC Remota:
1. ✅ Copiar 5 archivos de scripts
2. ✅ Instalar dependencias Python
3. ✅ Ejecutar `process_loxx_h5.bat` para convertir archivos
4. ✅ Ejecutar `start_loxx_server.bat` para iniciar servidor

### PC Local:
1. ✅ Actualizar `.env` con `RADAR_LOXX_URL=http://100.100.81.47:8080`
2. ✅ Iniciar servidor backend con `npm start`

---

## 🔍 Verificación

### En PC Remota:
- Abrir: `http://localhost:8080/api/radar/index`
- Deberías ver un JSON con la lista de PNGs

### En PC Local:
- Abrir: `http://localhost:5000/api/radar/LOXX/pngs`
- Deberías ver la lista de PNGs desde PostgreSQL

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito copiar todos los archivos del proyecto a la PC remota?**
R: No, solo los 5 archivos listados arriba.

**P: ¿Los archivos comprimidos se descomprimen en disco?**
R: No, el script lee los .h5 directamente desde los archivos comprimidos en memoria, sin descomprimir en disco.

**P: ¿Puedo usar el mismo servidor para LGUAXX y LOXX?**
R: Sí, pero es mejor usar servidores separados en puertos diferentes para evitar conflictos.

**P: ¿Qué pasa si cambio la IP de Tailscale?**
R: Solo necesitas actualizar `RADAR_LOXX_URL` en el archivo `.env` de la PC local.

---

## 📞 Soporte

Si tienes problemas, consulta:
- `CONFIGURACION_LOXX.md` - Guía completa de configuración
- Logs del servidor en PC remota
- Logs del servidor backend en PC local

