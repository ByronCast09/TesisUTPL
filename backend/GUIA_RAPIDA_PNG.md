# Guía Rápida: Descarga Automática de PNGs

## 🚀 Configuración Inicial (Solo una vez)

### 1. Configurar variables de entorno

Edita el archivo `.env` en la carpeta `backend/` y agrega:

```env
# PostgreSQL (OBLIGATORIO)
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_contraseña
DB_NAME=tu_base_de_datos

# Activar almacenamiento de PNGs (OBLIGATORIO)
STORE_PNG_IN_DB=true

# URLs remotas de radar (ya deberías tenerlas)
RADAR_LGUAXX_URL=http://192.168.1.100:8080
RADAR_LOXX_URL=http://192.168.1.100:8080

# Opcional: Cambiar frecuencia de descarga automática
# Por defecto: cada hora (0 * * * *)
PNG_DOWNLOAD_CRON=0 * * * *
```

### 2. Verificar configuración

Ejecuta el script de verificación:

```bash
cd backend
node scripts/verificar_automatizacion.js
```

Este script te dirá si falta algo por configurar.

## ⚙️ Automatización (Funciona Solo)

**¡La automatización YA está configurada!** Solo necesitas:

1. **Asegurarte de que el servidor esté corriendo** en tu PC remota:
   ```bash
   cd backend
   npm start
   ```

2. **El servidor automáticamente:**
   - Se conecta a PostgreSQL al iniciar
   - Crea las tablas necesarias si no existen
   - Inicia la tarea programada que descarga PNGs cada hora
   - Procesa todos los radares configurados (LGUAXX, LOXX)

3. **Ver los logs** en la consola del servidor:
   ```
   [png-download] Iniciando descarga automática de PNGs: 2025-01-24T12:00:00Z
   [png-download] Descargando PNGs recientes para LGUAXX...
   [png-download] LGUAXX: 12 descargados, 3 omitidos
   [png-download] Tarea completada en 45.2s
   ```

**¡Eso es todo!** No necesitas hacer nada más. La descarga se ejecuta automáticamente cada hora.

## 🔧 Ejecutar Descargas Manuales (Opcional)

Si quieres descargar PNGs manualmente sin esperar a la tarea programada:

### Opción 1: Usar el script de prueba

```bash
cd backend

# Descargar PNGs de los últimos 7 días
node scripts/probar_descarga_pngs.js LGUAXX recent

# Descargar PNGs de los últimos 3 días
node scripts/probar_descarga_pngs.js LGUAXX recent 3

# Descargar PNGs de una fecha específica
node scripts/probar_descarga_pngs.js LGUAXX date 2025-01-24

# Descargar TODOS los PNGs nuevos
node scripts/probar_descarga_pngs.js LGUAXX all
```

### Opción 2: Usar curl (desde terminal)

```bash
# Descargar PNGs recientes (últimos 7 días)
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=7"

# Descargar PNGs de una fecha específica
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/date?date=2025-01-24"

# Descargar todos los PNGs nuevos
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs"
```

### Opción 3: Usar Postman o similar

1. Método: **POST**
2. URL: `http://localhost:5000/api/radar/LGUAXX/download-pngs/recent`
3. Query params: `days=7` (opcional)

### Opción 4: Desde el código (JavaScript/React)

```javascript
import { downloadRecentPngs } from '@/services/radarService';

// Descargar PNGs de los últimos 3 días
const resultado = await downloadRecentPngs('LGUAXX', 3);
console.log(`Descargados: ${resultado.results.downloaded}`);
```

## 📊 Verificar que Funciona

### 1. Ver PNGs almacenados en PostgreSQL

```bash
# Desde la terminal
curl "http://localhost:5000/api/radar/LGUAXX/pngs?limit=10"

# O desde el navegador
http://localhost:5000/api/radar/LGUAXX/pngs/index
```

### 2. Ver una imagen específica

```bash
# Obtener el ID de una imagen desde el endpoint anterior
# Luego acceder a:
http://localhost:5000/api/radar/pngs/1/image
```

### 3. Ver logs del servidor

Cuando el servidor está corriendo, verás mensajes como:

```
[png-download] Tarea programada para descargar PNGs: 0 * * * *
[png-download] Iniciando descarga automática de PNGs: 2025-01-24T12:00:00Z
[png-download] Descargando PNGs recientes para LGUAXX...
PNG guardado en PostgreSQL: LGUAXX_20250124_120000.png (ID: 123)
[png-download] LGUAXX: 12 descargados, 3 omitidos
```

## 🎯 Resumen: ¿Qué Hacer en la PC Remota?

1. **Configurar `.env`** con las variables de PostgreSQL y `STORE_PNG_IN_DB=true`
2. **Iniciar el servidor**: `cd backend && npm start`
3. **¡Listo!** La automatización funciona sola cada hora

**No necesitas ejecutar POSTs manualmente** a menos que quieras descargar algo específico inmediatamente.

## ❓ Solución de Problemas

### La automatización no funciona

1. Verifica que el servidor esté corriendo
2. Ejecuta: `node scripts/verificar_automatizacion.js`
3. Revisa los logs del servidor para ver errores

### Los PNGs no se guardan

1. Verifica que `STORE_PNG_IN_DB=true` esté en `.env`
2. Verifica la conexión a PostgreSQL
3. Reinicia el servidor después de cambiar `.env`

### Error de conexión a PostgreSQL

1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en `.env`
3. Prueba la conexión manualmente

## 📝 Notas Importantes

- **La automatización se ejecuta cada hora automáticamente**
- **No necesitas hacer POSTs manuales** a menos que quieras algo específico
- **El servidor debe estar corriendo** para que la automatización funcione
- **Los logs te mostrarán** cuándo se ejecuta la descarga automática

