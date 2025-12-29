# ⚡ Guía Rápida: Automatización Completa

## 🎯 ¿Qué hace la automatización?

1. **Detecta nuevos archivos PPI** → Los convierte automáticamente a PNG
2. **Detecta nuevos PNGs** → Los sube automáticamente a PostgreSQL

**No necesitas ejecutar comandos manualmente. Todo es automático.**

---

## 📝 Configuración Rápida (3 pasos)

### Paso 1: Editar `.env`

Abre `backend/.env` y agrega:

```env
# Activar automatización
ENABLE_PPI_WATCHER=true
ENABLE_PNG_UPLOADER=true

# Rutas de tus archivos PPI
PPI_DATA_PATH_LGUAXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
PNG_OUTPUT_PATH_LGUAXX=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

# PostgreSQL
DB_HOST=100.124.134.19
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=byronPost
DB_NAME=radar_metadata
STORE_PNG_IN_DB=true

# Python (opcional)
PYTHON_CMD=python
```

### Paso 2: Instalar dependencias

```bash
cd backend
npm install
```

### Paso 3: Iniciar servidor

```bash
npm start
```

**¡Listo!** La automatización está activa.

---

## 🔍 Verificar que Funciona

Cuando inicies el servidor, deberías ver:

```
[auto-services] Iniciando monitoreo automático de PPI...
[auto-services] ✓ Monitoreo PPI iniciado para LGUAXX
[ppi-watcher] Monitoreo activo. Esperando nuevos archivos PPI...
[auto-services] Iniciando monitoreo automático de PNGs...
[png-upload] Monitoreo activo. Esperando nuevos PNGs...
```

Cuando aparezca un nuevo archivo PPI, verás:

```
[ppi-watcher] Procesando nuevo archivo PPI: archivo.ppi
[ppi-converter] ✓ archivo.ppi
[png-upload] ✓ PNG subido a PostgreSQL: LGUAXX_archivo.png
```

---

## ❓ Preguntas Frecuentes

### ¿Dónde ejecuto el comando de conversión?

**No necesitas ejecutarlo.** El sistema lo hace automáticamente cuando detecta nuevos PPI.

### ¿Cómo hago que sea automático?

**Ya es automático.** Solo configura `.env` e inicia el servidor.

### ¿Cada cuánto revisa por nuevos archivos?

**En tiempo real.** Usa monitoreo de archivos (file watching), no polling.

### ¿Puedo desactivar solo una parte?

Sí, en `.env`:
- `ENABLE_PPI_WATCHER=false` → Desactiva conversión automática
- `ENABLE_PNG_UPLOADER=false` → Desactiva subida automática

---

## 📊 Flujo Automático

```
Nuevo PPI → Detectado → Convertido → PNG → Detectado → Subido a PostgreSQL
   (auto)      (auto)       (auto)    (auto)    (auto)         (auto)
```

**Todo automático. No necesitas hacer nada.**

---

## 🚨 Solución Rápida de Problemas

### No detecta archivos nuevos
- Verifica que las rutas en `.env` sean correctas
- Verifica que los directorios existan
- Reinicia el servidor

### No sube a PostgreSQL
- Verifica `STORE_PNG_IN_DB=true` en `.env`
- Verifica la conexión a PostgreSQL
- Revisa los logs del servidor

### Error al ejecutar Python
- Verifica que Python esté instalado
- Verifica que `PYTHON_CMD` sea correcto
- Verifica que `advanced_ppi_converter.py` exista

---

## ✅ Resumen

1. ✅ Configura `.env` con rutas y activa servicios
2. ✅ Instala dependencias: `npm install`
3. ✅ Inicia servidor: `npm start`
4. ✅ **¡Listo!** Todo funciona automáticamente

**No necesitas ejecutar comandos manualmente. El sistema detecta y procesa todo automáticamente.**

