# ✅ Confirmación: API que Consume PostgreSQL y Proyecta en el Visor

## 🔍 Confirmación del Flujo

**SÍ, el sistema consume una API que lee los datos de PostgreSQL y los proyecta en el visor.**

### Flujo Completo:

```
1. PostgreSQL Local (Base de Datos)
   ↓
2. API Backend (Express.js)
   ↓
3. Visor Frontend (React)
```

### Detalles del Flujo:

1. **Base de Datos PostgreSQL**: Almacena los PNGs convertidos con sus metadatos
2. **API Backend**: Consulta PostgreSQL y expone los datos mediante endpoints REST
3. **Visor Frontend**: Consume la API y muestra las imágenes en el mapa interactivo

---

## 📍 Ubicación de la API

### Backend (API Server)

**Archivo principal**: `tesis_utpl/backend/server.js`

**Puerto por defecto**: `5000`

**Endpoints principales**:

1. **Obtener índice de PNGs para el visor**:
   - **Ruta**: `GET /api/radar/:radarId/pngs/viewer-index`
   - **Controlador**: `tesis_utpl/backend/controllers/radarController.js` → `getPngIndexForViewer()`
   - **Ejemplo**: `http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index`

2. **Obtener imagen PNG desde PostgreSQL**:
   - **Ruta**: `GET /api/radar/pngs/:id/image`
   - **Controlador**: `tesis_utpl/backend/controllers/radarController.js` → `getPngImageFromDb()`
   - **Ejemplo**: `http://localhost:5000/api/radar/pngs/123/image`

3. **Rutas definidas en**: `tesis_utpl/backend/routes/radarRoutes.js`

### Frontend (Servicio que consume la API)

**Archivo del servicio**: `tesis_utpl/src/services/radarService.js`

**Función principal**: `getPngIndexFromDbForViewer(radarId)`

**Componente del visor**: `tesis_utpl/src/pages/Visor.jsx`

**Línea clave**: Línea 186 - Usa `getPngIndexFromDbForViewer(radarId)` para obtener datos desde PostgreSQL

---

## 🚀 Pasos para Levantar Todo el Sistema

### Arquitectura del Sistema

El sistema tiene **DOS componentes principales**:

1. **PC REMOTA**: Monitorea, convierte y sube datos a PostgreSQL
2. **PC LOCAL**: Backend API y Frontend que consumen datos de PostgreSQL

---

## 🖥️ PARTE 1: PC REMOTA

### ¿Qué se levanta en la PC Remota?

**Servicio Python automático** que:
- Monitorea archivos PPI nuevos
- Convierte PPI → PNG automáticamente
- Sube PNGs a PostgreSQL automáticamente

### Pasos en PC Remota:

1. **Instalar dependencias**:
   ```bash
   pip install watchdog psycopg[binary]
   ```

2. **Configurar** `iniciar_servicio_ppi.bat`:
   - Ruta de archivos PPI
   - Ruta de salida PNG
   - Credenciales de PostgreSQL

3. **Ejecutar servicio**:
   ```bash
   iniciar_servicio_ppi.bat
   ```

**📄 Ver guía completa**: `PASOS_PC_REMOTA.md`

---

## 💻 PARTE 2: PC LOCAL

### Prerrequisitos

1. **Node.js** (v14.x o superior)
2. **PostgreSQL** instalado y corriendo (o acceso a PostgreSQL remoto)
3. **npm** o **yarn**

---

### Paso 1: Configurar Base de Datos PostgreSQL

1. **Crear la base de datos**:
   ```sql
   CREATE DATABASE radar_db;
   ```

2. **Ejecutar el esquema**:
   ```bash
   psql -U postgres -d radar_db -f tesis_utpl/backend/db/schema.sql
   ```

3. **Configurar variables de entorno** (crear archivo `.env` en `tesis_utpl/backend/`):
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=tu_password
   DB_NAME=radar_db
   ```

---

### Paso 2: Instalar Dependencias del Backend

```bash
cd tesis_utpl/backend
npm install
```

**Dependencias principales**:
- express
- cors
- pg (PostgreSQL client)
- dotenv
- axios

---

### Paso 3: Instalar Dependencias del Frontend

```bash
cd tesis_utpl
npm install
```

**Dependencias principales**:
- react
- react-dom
- react-leaflet
- axios
- vite

---

### Paso 4: Configurar Variables de Entorno del Frontend

Crear archivo `.env` en `tesis_utpl/`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

### Paso 5: Iniciar el Backend (API Server)

```bash
cd tesis_utpl/backend
npm start
```

O en modo desarrollo:
```bash
npm run dev
```

**Verificar que está corriendo**:
- Abrir: `http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index`
- Debería devolver un JSON con el índice de PNGs

---

### Paso 6: Iniciar el Frontend (Visor)

En una **nueva terminal**:

```bash
cd tesis_utpl
npm start
```

O con Vite directamente:
```bash
npm run dev
```

**El visor se abrirá en**: `http://localhost:5173` (o el puerto que Vite asigne)

---

### Paso 7: Verificar que Todo Funciona

1. **Abrir el visor** en el navegador: `http://localhost:5173`
2. **Seleccionar un radar** (LGUAXX o LOXX)
3. **Verificar que aparecen fechas disponibles** (si hay datos en PostgreSQL)
4. **Seleccionar una fecha** y verificar que se cargan las imágenes

---

## 🔧 Comandos Rápidos (Resumen)

```bash
# 1. Configurar PostgreSQL
psql -U postgres -d radar_db -f tesis_utpl/backend/db/schema.sql

# 2. Backend
cd tesis_utpl/backend
npm install
npm start

# 3. Frontend (en otra terminal)
cd tesis_utpl
npm install
npm start
```

---

## 📊 Flujo de Datos Confirmado

```
┌─────────────────┐
│  PostgreSQL     │  ← Almacena PNGs y metadatos
│  (Base de Datos)│
└────────┬────────┘
         │
         │ Consulta SQL
         ↓
┌─────────────────┐
│  Backend API    │  ← Express.js en puerto 5000
│  (server.js)    │     Endpoint: /api/radar/:radarId/pngs/viewer-index
└────────┬────────┘
         │
         │ HTTP Request (axios)
         ↓
┌─────────────────┐
│  Frontend       │  ← React + Vite en puerto 5173
│  (Visor.jsx)    │     Servicio: radarService.js
└─────────────────┘
         │
         │ Renderiza en mapa
         ↓
┌─────────────────┐
│  Visor Web      │  ← Mapa interactivo con imágenes
│  (React-Leaflet)│
└─────────────────┘
```

---

## 📝 Archivos Clave

### Backend:
- `tesis_utpl/backend/server.js` - Servidor Express principal
- `tesis_utpl/backend/routes/radarRoutes.js` - Definición de rutas
- `tesis_utpl/backend/controllers/radarController.js` - Lógica de endpoints
- `tesis_utpl/backend/services/radarMetadataRepository.js` - Consultas a PostgreSQL
- `tesis_utpl/backend/services/db.js` - Conexión a PostgreSQL

### Frontend:
- `tesis_utpl/src/pages/Visor.jsx` - Componente principal del visor
- `tesis_utpl/src/services/radarService.js` - Servicio que consume la API
- `tesis_utpl/src/App.jsx` - Aplicación principal

### Documentación:
- `tesis_utpl/backend/API_VISOR_POSTGRESQL.md` - Documentación completa de la API
- `tesis_utpl/CAMBIOS_VISOR_POSTGRESQL.md` - Cambios realizados para usar PostgreSQL

---

## ✅ Confirmación Final

**SÍ, el sistema funciona así:**

1. ✅ **PostgreSQL** almacena los PNGs convertidos
2. ✅ **API Backend** consulta PostgreSQL mediante `radarMetadataRepository`
3. ✅ **API expone** los datos en formato compatible con el visor
4. ✅ **Frontend consume** la API mediante `getPngIndexFromDbForViewer()`
5. ✅ **Visor proyecta** las imágenes en el mapa interactivo

**Endpoint principal**: `/api/radar/:radarId/pngs/viewer-index`

**Función del frontend**: `getPngIndexFromDbForViewer(radarId)` en `radarService.js`

---

## 🆘 Troubleshooting

### Si el backend no inicia:
- Verificar que PostgreSQL está corriendo
- Verificar variables de entorno en `.env`
- Verificar que el puerto 5000 no está en uso

### Si el frontend no conecta:
- Verificar que `VITE_API_URL` está configurado correctamente
- Verificar que el backend está corriendo en el puerto correcto
- Revisar la consola del navegador para errores

### Si no hay datos en el visor:
- Verificar que hay datos en PostgreSQL
- Verificar que el endpoint `/api/radar/:radarId/pngs/viewer-index` devuelve datos
- Revisar los logs del backend para errores

---

*Última actualización: Basado en el código actual del proyecto*

