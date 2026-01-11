# Tecnologías del Proyecto - Descripción Resumida

## Frontend

### React
- **Descripción:** Biblioteca JavaScript para construir interfaces de usuario interactivas mediante componentes reutilizables.
- **Uso en el proyecto:** Base del visor de radar, manejo de estado y renderizado de componentes.

### Vite
- **Descripción:** Herramienta de construcción rápida para desarrollo frontend, con Hot Module Replacement (HMR) instantáneo.
- **Uso en el proyecto:** Servidor de desarrollo y bundler para la aplicación React.

### React Router DOM
- **Descripción:** Librería de enrutamiento para aplicaciones React de una sola página (SPA).
- **Uso en el proyecto:** Navegación entre páginas del visor (Home, Visor, etc.).

### Leaflet / React-Leaflet
- **Descripción:** Librería de código abierto para mapas interactivos. React-Leaflet es el wrapper para React.
- **Uso en el proyecto:** Visualización de mapas base y superposición de imágenes de radar (ImageOverlay).

### Tailwind CSS
- **Descripción:** Framework CSS utility-first para diseño rápido y consistente.
- **Uso en el proyecto:** Estilos y diseño responsive de la interfaz del visor.

### Axios
- **Descripción:** Cliente HTTP basado en promesas para realizar peticiones a APIs.
- **Uso en el proyecto:** Comunicación con el backend para obtener datos de radar (PNGs, metadatos, fechas).

### Recharts
- **Descripción:** Librería de gráficos para React basada en D3.js.
- **Uso en el proyecto:** Visualización de datos estadísticos y gráficos (si aplica).

---

## Backend

### Node.js
- **Descripción:** Entorno de ejecución JavaScript del lado del servidor basado en V8.
- **Uso en el proyecto:** Servidor backend que gestiona APIs, sincronización y base de datos.

### Express.js
- **Descripción:** Framework web minimalista y flexible para Node.js.
- **Uso en el proyecto:** Creación de APIs REST para servir datos de radar al frontend.

### PostgreSQL (pg)
- **Descripción:** Sistema de gestión de bases de datos relacionales de código abierto.
- **Uso en el proyecto:** Almacenamiento de imágenes PNG (BYTEA), metadatos (JSONB) y índices de radar.

### CORS
- **Descripción:** Middleware para habilitar Cross-Origin Resource Sharing entre frontend y backend.
- **Uso en el proyecto:** Permitir peticiones desde el frontend al backend en diferentes puertos.

### Node-Schedule
- **Descripción:** Programador de tareas para Node.js basado en cron.
- **Uso en el proyecto:** Automatización de sincronización de datos de radar (descargas periódicas).

### SSH2-SFTP-Client
- **Descripción:** Cliente SFTP para transferir archivos de forma segura mediante SSH.
- **Uso en el proyecto:** Descarga de archivos desde PC remota (radar LOXX/GUAXX) a PC local.

### Chokidar
- **Descripción:** Librería para monitorear cambios en archivos y directorios.
- **Uso en el proyecto:** Detección automática de nuevos archivos PNG procesados para sincronización.

### Multer
- **Descripción:** Middleware para manejar multipart/form-data (subida de archivos).
- **Uso en el proyecto:** Procesamiento de archivos subidos al servidor.

### Dotenv
- **Descripción:** Módulo para cargar variables de entorno desde archivo .env.
- **Uso en el proyecto:** Configuración de credenciales de base de datos, rutas y parámetros del sistema.

---

## Procesamiento de Datos (Python)

### Python 3
- **Descripción:** Lenguaje de programación de alto nivel para procesamiento científico y automatización.
- **Uso en el proyecto:** Scripts de procesamiento de datos de radar (H5 → PNG).

### H5py
- **Descripción:** Librería Python para leer y escribir archivos HDF5 (formato de datos científicos).
- **Uso en el proyecto:** Extracción de datos DBZH (reflectividad) desde archivos .h5 del radar.

### NumPy
- **Descripción:** Librería fundamental para computación científica con arrays multidimensionales.
- **Uso en el proyecto:** Manipulación de matrices de datos de radar, operaciones matemáticas y filtros.

### Pillow (PIL)
- **Descripción:** Librería Python para procesamiento de imágenes (abrir, manipular y guardar formatos).
- **Uso en el proyecto:** Generación de imágenes PNG desde arrays NumPy con transparencia.

### Matplotlib
- **Descripción:** Librería de visualización y gráficos científicos en Python.
- **Uso en el proyecto:** Aplicación de colormaps meteorológicos a datos de radar (escala de colores DBZH).

### SciPy
- **Descripción:** Librería científica que extiende NumPy con funciones avanzadas (filtros, interpolación).
- **Uso en el proyecto:** Filtros de mediana y corrección de clutter (ruido) en datos de radar.

### Gzip
- **Descripción:** Módulo estándar de Python para compresión/descompresión de archivos .gz.
- **Uso en el proyecto:** Lectura de archivos .h5.gz comprimidos sin descomprimir en disco.

---

## Infraestructura y Herramientas

### Tailscale
- **Descripción:** Red privada virtual (VPN) para conectar dispositivos de forma segura.
- **Uso en el proyecto:** Conexión segura entre PC remota (donde está el radar) y PC local (servidor).

### Git
- **Descripción:** Sistema de control de versiones distribuido.
- **Uso en el proyecto:** Gestión de código fuente y colaboración.

### NPM / Node Package Manager
- **Descripción:** Gestor de paquetes para Node.js.
- **Uso en el proyecto:** Instalación y gestión de dependencias del proyecto.

---

## Arquitectura del Sistema

### Arquitectura Cliente-Servidor
- **Frontend (React):** Interfaz de usuario en el navegador.
- **Backend (Node.js):** Servidor API y lógica de negocio.
- **Base de Datos (PostgreSQL):** Almacenamiento persistente de datos.
- **PC Remota (Python):** Procesamiento de datos de radar y servidor HTTP local.

### Flujo de Datos
1. **PC Remota:** Archivos .h5 comprimidos → Scripts Python procesan → Generan PNGs + JSON metadata.
2. **PC Local:** Backend descarga PNGs vía SFTP → Sube a PostgreSQL → Expone vía API REST.
3. **Frontend:** Consume API → Muestra imágenes en mapa Leaflet con controles de animación.


