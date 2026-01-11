# Guía para Capturas de Pantalla - Capítulo 4

Esta guía describe qué capturas de pantalla necesitas tomar y dónde encontrarlas en el proyecto.

## Estructura de Carpetas Recomendada

```
docs/
  capturas/
    sprint1/
    sprint2/
    sprint3/
    sprint4/
    sprint5/
```

## Sprint 1: Establecimiento del Pipeline

### IMAGEN 4.1: Script advanced_ppi_converter.py
**Ubicación del archivo**: `tesis_utpl/scripts/advanced_ppi_converter.py`
**Qué capturar**: 
- Abre el archivo en tu editor (VS Code, PyCharm, etc.)
- Captura mostrando la estructura de clases (líneas 1-100 aproximadamente)
- Resalta las funciones principales: `qt_decompress`, `load_ppi`, `data_to_png`

### IMAGEN 4.2: Diagrama de descompresión BLOB Qt
**Qué crear**: 
- Crea un diagrama de flujo mostrando:
  1. Lectura del header del BLOB
  2. Identificación del tipo de compresión
  3. Proceso de descompresión
  4. Extracción de datos
- Puedes usar: draw.io, Lucidchart, o PowerPoint

### IMAGEN 4.3: Ejemplo de index.json
**Ubicación del archivo**: `tesis_utpl/scripts/` (busca un archivo index.json generado)
**Qué capturar**:
- Abre un archivo `index.json` generado
- Captura mostrando la estructura JSON con fechas y archivos
- Si no existe, ejecuta el script para generar uno

### IMAGEN 4.4: Servidor radar_server.py en ejecución
**Ubicación del archivo**: `tesis_utpl/scripts/radar_server.py`
**Qué capturar**:
- Ejecuta el servidor: `python radar_server.py`
- Captura la terminal mostrando:
  - El servidor iniciado
  - Los endpoints disponibles
  - El puerto en el que está corriendo
- También puedes capturar una petición HTTP exitosa

### IMAGEN 4.5: Diseño en Figma
**Qué capturar**:
- Abre tu proyecto en Figma
- Captura el diseño principal del visor
- Muestra: layout, colores, tipografía
- Si no tienes Figma, captura el diseño final implementado

## Sprint 2: Visor Interactivo

### IMAGEN 4.6: Mapa interactivo con React-Leaflet
**Ubicación**: Ejecuta el frontend y abre el visor
**Qué capturar**:
- Captura del visor mostrando:
  - El mapa con overlay de imagen radar
  - Controles de zoom
  - Marcadores si los hay
- URL: `http://localhost:5173` (o tu puerto)

### IMAGEN 4.7: Panel "Glass"
**Ubicación**: Mismo visor
**Qué capturar**:
- Captura del panel con efecto glass
- Muestra: controles de radar, fecha, reproducción
- Resalta el efecto de transparencia

### IMAGEN 4.8: Controles de reproducción
**Ubicación**: Panel de reproducción en el visor
**Qué capturar**:
- Captura mostrando:
  - Botones play/pause
  - Selector de velocidad
  - Timeline con frame actual
  - Botones anterior/siguiente

### IMAGEN 4.9: Filtros horarios
**Ubicación**: Panel de filtros en el visor
**Qué capturar**:
- Captura del selector de filtros
- Muestra: selector de rango horario, botón aplicar

### IMAGEN 4.10: Diagrama de sistema de caché
**Qué crear**:
- Diagrama mostrando:
  - Flujo de petición de imagen
  - Verificación de caché
  - Descarga si no está en caché
  - Almacenamiento en caché

### IMAGEN 4.11: Documentación SFTP
**Ubicación del archivo**: `tesis_utpl/scripts/GUIA_RAPIDA_PC_REMOTA.md`
**Qué capturar**:
- Abre el archivo Markdown
- Captura las secciones principales de la documentación

### IMAGEN 4.12: Mapa con capas adicionales
**Ubicación**: Visor con capas activadas
**Qué capturar**:
- Captura del mapa mostrando:
  - Múltiples capas activas
  - Marcadores
  - Popups informativos

### IMAGEN 4.13: Gráfico de barras
**Ubicación**: Panel de gráficos en el visor
**Qué capturar**:
- Captura del gráfico de barras
- Muestra datos de precipitación por región o tiempo

## Sprint 3: Backend y Operatividad

### IMAGEN 4.14: Diagrama de arquitectura del proxy
**Qué crear**:
- Diagrama mostrando:
  - Frontend → Proxy Express → Servicios remotos
  - Balanceo de carga
  - Caché de respuestas

### IMAGEN 4.15: Dashboard de monitoreo
**Ubicación**: Si tienes un dashboard de logs
**Qué capturar**:
- Captura del dashboard mostrando logs en tiempo real
- Si no existe, captura los logs en la terminal o archivo de log

### IMAGEN 4.16: Configuración CORS
**Ubicación del archivo**: `tesis_utpl/backend/server.js`
**Qué capturar**:
- Busca la configuración de CORS en el archivo
- Captura el código de configuración CORS

### IMAGEN 4.17: Documentación API (Swagger)
**Ubicación**: Si tienes Swagger configurado
**Qué capturar**:
- Abre la documentación Swagger (generalmente en `/api-docs`)
- Captura mostrando los endpoints disponibles
- Si no tienes Swagger, captura la documentación en Markdown

### IMAGEN 4.18: Resultados de pruebas
**Ubicación**: Ejecuta los tests
**Qué capturar**:
- Ejecuta: `npm test` o `npm run test`
- Captura la terminal mostrando:
  - Tests ejecutados
  - Resultados (pass/fail)
  - Cobertura de código

### IMAGEN 4.19: Diagrama de roles
**Qué crear**:
- Diagrama mostrando:
  - Jerarquía de roles (Admin → Operador → Visualizador → Público)
  - Permisos asociados a cada rol

### IMAGEN 4.20: Interfaz mejorada
**Ubicación**: Visor con mejoras implementadas
**Qué capturar**:
- Captura de la interfaz mostrando:
  - Nueva navegación
  - Indicadores de estado
  - Mensajes de ayuda

### IMAGEN 4.21: Dashboard público
**Ubicación**: Página de dashboard público
**Qué capturar**:
- Captura del dashboard público
- Muestra gráficos y estadísticas disponibles

## Sprint 4: Datos Históricos

### IMAGEN 4.22: Diagrama de esquema de BD
**Ubicación del archivo**: `tesis_utpl/backend/db/schema.sql`
**Qué capturar**:
- Abre el archivo schema.sql
- Captura mostrando las tablas principales
- O crea un diagrama ER usando una herramienta

### IMAGEN 4.23: Interfaz de administración de BD
**Ubicación**: Si usas pgAdmin, DBeaver, o similar
**Qué capturar**:
- Abre tu herramienta de administración de BD
- Captura mostrando:
  - Lista de tablas
  - Estructura de una tabla
  - Estadísticas

### IMAGEN 4.24: Panel de filtros avanzados
**Ubicación**: Visor con filtros implementados
**Qué capturar**:
- Captura del panel de filtros
- Muestra: selectores de fecha, provincia, opciones de combinación

### IMAGEN 4.25: Selección de radares
**Ubicación**: Visor con selector de radar
**Qué capturar**:
- Captura mostrando:
  - Selector de radar
  - Múltiples radares en el mapa (si aplica)

### IMAGEN 4.26: Diálogo de exportación
**Ubicación**: Botón de exportar en el visor
**Qué capturar**:
- Captura del diálogo/modal de exportación
- Muestra: opciones de formato, resolución, rango

### IMAGEN 4.27: Visor en móvil
**Qué capturar**:
- Abre el visor en un dispositivo móvil o emulador
- Captura mostrando la adaptación responsive
- Muestra menú hamburguesa y controles táctiles

### IMAGEN 4.28: Visor en tablet
**Qué capturar**:
- Similar a móvil pero en tablet o emulador de tablet
- Muestra el layout intermedio

### IMAGEN 4.29: Pruebas en dispositivo real
**Qué capturar**:
- Foto del dispositivo físico mostrando el visor
- O captura de pantalla desde el dispositivo

## Sprint 5: Analytics y Testeo

### IMAGEN 4.30: Dashboard de analytics
**Ubicación**: Si tienes dashboard de analytics
**Qué capturar**:
- Captura del dashboard mostrando:
  - Gráficos de uso
  - Métricas de rendimiento
  - Estadísticas de usuarios

### IMAGEN 4.31: Reporte de seguridad
**Ubicación**: Resultados de escaneo de seguridad
**Qué capturar**:
- Captura del reporte de herramientas como:
  - npm audit
  - OWASP ZAP
  - Snyk
- Muestra vulnerabilidades encontradas y resueltas

### IMAGEN 4.32: Panel de configuración de alertas
**Ubicación**: Panel de administración de alertas
**Qué capturar**:
- Captura del panel mostrando:
  - Umbrales configurados
  - Historial de alertas
  - Opciones de notificación

### IMAGEN 4.33: Notificación de alerta
**Ubicación**: Cuando se genera una alerta
**Qué capturar**:
- Captura de cómo se muestra una alerta al usuario
- Muestra: tipo de alerta, detalles, acciones disponibles

### IMAGEN 4.34: Diagrama de arquitectura escalable
**Qué crear**:
- Diagrama mostrando:
  - Múltiples instancias del servidor
  - Load balancer
  - Base de datos replicada
  - CDN para assets

## Consejos para las Capturas

1. **Resolución**: Usa capturas de alta resolución (al menos 1920x1080)
2. **Formato**: Guarda en PNG para mejor calidad
3. **Nombres**: Usa nombres descriptivos: `sprint1_advanced_ppi_converter.png`
4. **Anotaciones**: Puedes usar flechas o recuadros para resaltar elementos importantes
5. **Consistencia**: Mantén el mismo estilo en todas las capturas
6. **Privacidad**: Oculta información sensible (IPs, tokens, etc.)

## Herramientas Recomendadas

- **Capturas**: Snipping Tool (Windows), Screenshot (Mac), ShareX
- **Anotaciones**: Paint, GIMP, Photoshop, Figma
- **Diagramas**: draw.io, Lucidchart, PowerPoint, Visio
- **Edición**: GIMP, Photoshop, Canva

## Checklist de Capturas

- [ ] Sprint 1: 5 imágenes
- [ ] Sprint 2: 8 imágenes
- [ ] Sprint 3: 8 imágenes
- [ ] Sprint 4: 8 imágenes
- [ ] Sprint 5: 5 imágenes
- **Total**: 34 imágenes

