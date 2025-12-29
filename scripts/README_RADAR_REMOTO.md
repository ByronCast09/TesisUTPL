# Sistema de Radar Remoto - Guía Completa

## Descripción

Este sistema permite convertir datos de radar .ppi desde una PC remota y visualizarlos en tiempo real en un visor web con Leaflet.js. Los datos se convierten a imágenes PNG con transparencia y se sirven a través de un servidor HTTP.

## Arquitectura del Sistema

```
PC Remota (Datos .ppi) → Conversión PNG → Servidor HTTP → Visor Web (Leaflet.js)
```

## Componentes

### 1. Scripts de Conversión
- `advanced_ppi_converter.py`: Convierte archivos .ppi a PNG con transparencia
- `radar_server.py`: Servidor HTTP para servir las imágenes
- `setup_remote_radar.py`: Configuración automática del sistema

### 2. Servicio Frontend
- `remoteRadarService.js`: Servicio para conectar con la PC remota
- Modificaciones en `Visor.jsx`: Interfaz para radar remoto

## Instalación en PC Remota

### Paso 1: Preparar el entorno

```bash
# Instalar Python (si no está instalado)
# Descargar desde: https://www.python.org/downloads/

# Instalar dependencias
pip install numpy Pillow
```

### Paso 2: Copiar archivos

Copia estos archivos a la PC remota:
- `advanced_ppi_converter.py`
- `radar_server.py`
- `setup_remote_radar.py`
- `INSTRUCCIONES_PC_REMOTA.md`

### Paso 3: Configuración automática

```bash
# Ejecutar configuración completa
python setup_remote_radar.py --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" --output-path "C:\radar_server\converted_images" --port 8080
```

### Paso 4: Iniciar servidor

```bash
# Opción 1: Usar script de inicio
C:\radar_server\converted_images\start_radar_server.bat

# Opción 2: Comando manual
python radar_server.py --data-path "C:\radar_server\converted_images" --port 8080
```

## Configuración en el Visor

### Paso 1: Configurar URL del servidor remoto

Crear archivo `.env` en la raíz del proyecto:

```env
# URL del servidor remoto (cambiar por la IP real)
VITE_REMOTE_RADAR_URL=http://192.168.1.100:8080
```

### Paso 2: Usar el visor

1. Abrir el visor web
2. Activar el toggle "Remoto" en el header
3. Ingresar la URL del servidor remoto (ej: `http://192.168.1.100:8080`)
4. Hacer clic en "Conectar"
5. Seleccionar fecha e imagen deseada

## Endpoints del Servidor Remoto

- **Base**: `http://IP:8080`
- **Índice**: `http://IP:8080/api/radar/index`
- **Última imagen**: `http://IP:8080/api/radar/latest`
- **Imagen específica**: `http://IP:8080/api/radar/image/LGUAXX_<timestamp>.png`

## Estructura de Archivos

```
PC Remota:
D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi\
├── 2025-01-15\
│   ├── radar_001.ppi
│   ├── radar_002.ppi
│   └── ...
└── 2025-01-16\
    ├── radar_001.ppi
    └── ...

C:\radar_server\
├── converted_images\
│   ├── index.json
│   ├── LGUAXX_<timestamp1>.png
│   ├── LGUAXX_<timestamp2>.png
│   └── ...
├── advanced_ppi_converter.py
├── radar_server.py
└── setup_remote_radar.py
```

## Características del Sistema

### Conversión de Datos
- Convierte archivos .ppi a PNG con transparencia
- Maneja diferentes formatos de archivos PPI
- Aplica colores según escala dBZ
- Optimiza imágenes para web

### Servidor HTTP
- Servidor ligero y rápido
- API REST para acceso a datos
- Soporte CORS para acceso web
- Cache de imágenes

### Visor Web
- Integración con Leaflet.js
- Overlay transparente sobre mapa
- Control de opacidad
- Selección de fechas e imágenes
- Auto-refresh de datos

## Solución de Problemas

### Error: "Servidor remoto no disponible"
1. Verificar que el servidor esté ejecutándose en la PC remota
2. Verificar la URL (IP y puerto)
3. Verificar firewall de la PC remota
4. Probar acceso directo: `http://IP:8080/api/radar/index`

### Error: "No se pueden leer archivos PPI"
1. Verificar que los archivos .ppi existen
2. Verificar permisos de lectura
3. Verificar formato de archivos

### Error: "No se pueden crear imágenes PNG"
1. Verificar que PIL está instalado
2. Verificar permisos de escritura
3. Verificar espacio en disco

### Error: "CORS" en el navegador
1. El servidor ya incluye headers CORS
2. Verificar que no hay proxy bloqueando
3. Probar desde navegador diferente

## Comandos Útiles

### En PC Remota

```bash
# Verificar que el servidor funciona
curl http://localhost:8080/api/radar/index

# Convertir solo datos nuevos
python advanced_ppi_converter.py --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" --output-path "C:\radar_server\converted_images"

# Reiniciar servidor
python radar_server.py --data-path "C:\radar_server\converted_images" --port 8080
```

### En el Visor

```javascript
// Verificar conexión
remoteRadarService.checkServerStatus()

// Obtener información
remoteRadarService.getServerInfo()

// Cargar última imagen
remoteRadarService.getLatestImageUrl()
```

## Automatización

### Tarea Programada (Windows)

Para iniciar automáticamente el servidor:

1. Abrir "Programador de tareas"
2. Crear tarea básica
3. Acción: Iniciar programa
4. Programa: `python`
5. Argumentos: `C:\radar_server\radar_server.py --data-path C:\radar_server\converted_images --port 8080`
6. Configurar para iniciar al arrancar Windows

### Script de Monitoreo

```bash
# Crear script para verificar que el servidor esté funcionando
@echo off
:loop
curl -s http://localhost:8080/api/radar/index > nul
if errorlevel 1 (
    echo Servidor no responde, reiniciando...
    python C:\radar_server\radar_server.py --data-path C:\radar_server\converted_images --port 8080
)
timeout /t 60
goto loop
```

## Seguridad

### Configuración de Firewall

```bash
# Abrir puerto específico
netsh advfirewall firewall add rule name="Radar Server" dir=in action=allow protocol=TCP localport=8080

# Restringir a IPs específicas (opcional)
netsh advfirewall firewall add rule name="Radar Server Restricted" dir=in action=allow protocol=TCP localport=8080 remoteip=192.168.1.0/24
```

### Acceso Restringido

Para limitar el acceso a IPs específicas, modificar `radar_server.py`:

```python
# En la clase RadarHTTPHandler, agregar verificación de IP
def do_GET(self):
    client_ip = self.client_address[0]
    allowed_ips = ['192.168.1.0/24', '10.0.0.0/8']
    
    if not self.is_ip_allowed(client_ip, allowed_ips):
        self.send_error(403, "Access denied")
        return
    
    # ... resto del código
```

## Rendimiento

### Optimizaciones del Servidor
- Cache de imágenes en memoria
- Compresión de imágenes
- Respuestas HTTP optimizadas

### Optimizaciones del Visor
- Cache de URLs de blob
- Lazy loading de imágenes
- Debounce en actualizaciones

## Monitoreo

### Logs del Servidor
El servidor muestra logs en consola:
```
[2025-01-15 10:30:15] GET /api/radar/index HTTP/1.1" 200
[2025-01-15 10:30:16] GET /api/radar/image/LGUAXX_20250115_103000.png HTTP/1.1" 200
```

### Métricas del Sistema
- Número de archivos convertidos
- Tamaño de imágenes
- Tiempo de respuesta
- Uso de memoria

## Actualizaciones

### Actualizar Datos
```bash
# Convertir datos nuevos
python advanced_ppi_converter.py --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" --output-path "C:\radar_server\converted_images"
```

### Actualizar Servidor
```bash
# Reiniciar servidor para cargar nuevos datos
# El servidor detecta automáticamente nuevos archivos
```

## Soporte

### Archivos de Log
- Servidor: Logs en consola
- Conversor: Logs en consola
- Visor: Logs en consola del navegador (F12)

### Información de Debug
```javascript
// En consola del navegador
console.log(remoteRadarService.getServerInfo());
console.log(remoteRadarService.checkServerStatus());
```

### Contacto
Para soporte técnico, revisar:
1. Logs del servidor
2. Logs del navegador
3. Estado de la red
4. Configuración de firewall
