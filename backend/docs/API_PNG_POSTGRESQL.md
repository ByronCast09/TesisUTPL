# API para Descarga y Almacenamiento de PNGs en PostgreSQL

Esta documentación describe la nueva API para comunicar el visor con la base de datos PostgreSQL, permitiendo la descarga automática de PNGs y su almacenamiento en la base de datos.

## Configuración

### Variables de Entorno Requeridas

Asegúrate de tener configuradas las siguientes variables de entorno en tu archivo `.env`:

```env
# Configuración de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=tu_base_de_datos

# Activar almacenamiento de PNGs en la base de datos
STORE_PNG_IN_DB=true

# Configuración de URLs remotas de radar
RADAR_LGUAXX_URL=http://tu-servidor-remoto:8080
RADAR_LOXX_URL=http://tu-servidor-remoto:8080

# Configuración de tarea programada (opcional)
# Formato cron: minuto hora día mes día-semana
# Por defecto: cada hora (0 * * * *)
PNG_DOWNLOAD_CRON=0 * * * *
```

### Inicialización de la Base de Datos

El esquema de la base de datos se crea automáticamente al iniciar el servidor. Asegúrate de que PostgreSQL esté corriendo y que las credenciales sean correctas.

## Endpoints de la API

### 1. Descargar todos los PNGs nuevos de un radar

**POST** `/api/radar/:radarId/download-pngs`

Descarga todos los PNGs nuevos disponibles para un radar y los almacena en PostgreSQL.

**Parámetros:**
- `radarId` (path): ID del radar (LGUAXX, LOXX, etc.)

**Ejemplo:**
```bash
curl -X POST http://localhost:5000/api/radar/LGUAXX/download-pngs
```

**Respuesta:**
```json
{
  "success": true,
  "radar": "LGUAXX",
  "results": {
    "totalDates": 10,
    "downloaded": 45,
    "skipped": 5,
    "errors": []
  }
}
```

### 2. Descargar PNGs de una fecha específica

**POST** `/api/radar/:radarId/download-pngs/date?date=YYYY-MM-DD`

Descarga todos los PNGs de una fecha específica y los almacena en PostgreSQL.

**Parámetros:**
- `radarId` (path): ID del radar
- `date` (query): Fecha en formato YYYY-MM-DD

**Ejemplo:**
```bash
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/date?date=2025-01-24"
```

**Respuesta:**
```json
{
  "success": true,
  "radar": "LGUAXX",
  "date": "2025-01-24",
  "results": {
    "downloaded": 12,
    "skipped": 0,
    "errors": []
  }
}
```

### 3. Descargar PNGs recientes

**POST** `/api/radar/:radarId/download-pngs/recent?days=N`

Descarga PNGs de los últimos N días.

**Parámetros:**
- `radarId` (path): ID del radar
- `days` (query): Número de días (1-365, por defecto: 7)

**Ejemplo:**
```bash
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=3"
```

### 4. Obtener PNGs desde PostgreSQL

**GET** `/api/radar/:radarId/pngs?date=YYYY-MM-DD&limit=100`

Obtiene la lista de PNGs almacenados en PostgreSQL.

**Parámetros:**
- `radarId` (path): ID del radar
- `date` (query, opcional): Filtrar por fecha
- `limit` (query, opcional): Límite de resultados (por defecto: 100)

**Ejemplo:**
```bash
curl "http://localhost:5000/api/radar/LGUAXX/pngs?date=2025-01-24&limit=50"
```

**Respuesta:**
```json
{
  "success": true,
  "radar": "LGUAXX",
  "count": 12,
  "pngs": [
    {
      "id": 1,
      "filename": "LGUAXX_20250124_120000.png",
      "sourceTimestamp": "2025-01-24T12:00:00Z",
      "processedAt": "2025-01-24T13:00:00Z",
      "fileSize": 245678,
      "hasImageData": true,
      "metadata": {...}
    }
  ]
}
```

### 5. Obtener índice de PNGs desde PostgreSQL

**GET** `/api/radar/:radarId/pngs/index`

Obtiene un índice organizado por fecha de todos los PNGs almacenados.

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/index
```

**Respuesta:**
```json
{
  "success": true,
  "radar": "LGUAXX",
  "index": [
    {
      "date": "2025-01-24",
      "png": [
        {
          "name": "LGUAXX_20250124_120000.png",
          "id": 1,
          "timestamp": "2025-01-24T12:00:00Z",
          "size": 245678
        }
      ]
    }
  ]
}
```

### 6. Obtener imagen PNG desde PostgreSQL

**GET** `/api/radar/pngs/:id/image`

Obtiene la imagen PNG almacenada en la base de datos.

**Parámetros:**
- `id` (path): ID del registro en la base de datos

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/pngs/1/image -o imagen.png
```

O en HTML:
```html
<img src="http://localhost:5000/api/radar/pngs/1/image" alt="Imagen radar" />
```

## Automatización

La descarga automática de PNGs está configurada para ejecutarse automáticamente cada hora. Puedes configurar el intervalo usando la variable de entorno `PNG_DOWNLOAD_CRON`.

### Formato Cron

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── día de la semana (0-7, donde 0 y 7 = domingo)
│ │ │ └───── mes (1-12)
│ │ └─────── día del mes (1-31)
│ └───────── hora (0-23)
└─────────── minuto (0-59)
```

**Ejemplos:**
- `0 * * * *` - Cada hora
- `0 */2 * * *` - Cada 2 horas
- `0 0 * * *` - Una vez al día a medianoche
- `*/30 * * * *` - Cada 30 minutos

## Uso desde el Frontend

### Ejemplo con React

```javascript
import { 
  downloadPngsForDate, 
  getPngsFromDb, 
  getPngImageUrl,
  getPngIndexFromDb 
} from '@/services/radarService';

// Descargar PNGs de una fecha
const downloadPngs = async (radarId, date) => {
  try {
    const result = await downloadPngsForDate(radarId, date);
    console.log(`Descargados: ${result.results.downloaded}`);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Obtener PNGs desde la base de datos
const getPngs = async (radarId, date) => {
  try {
    const data = await getPngsFromDb(radarId, date);
    return data.pngs;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Obtener índice de PNGs
const getIndex = async (radarId) => {
  try {
    const data = await getPngIndexFromDb(radarId);
    return data.index;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

// Mostrar imagen
const ImageComponent = ({ pngId }) => {
  return <img src={getPngImageUrl(pngId)} alt="Radar" />;
};
```

## Notas Importantes

1. **Almacenamiento**: Las imágenes se almacenan como BYTEA en PostgreSQL. Asegúrate de tener suficiente espacio en disco.

2. **Rendimiento**: Para grandes volúmenes de datos, considera usar índices adicionales o particionar la tabla.

3. **Deduplicación**: El sistema verifica si un PNG ya existe antes de descargarlo, evitando duplicados.

4. **Errores**: Los errores durante la descarga se registran pero no detienen el proceso completo.

5. **Configuración**: Asegúrate de que `STORE_PNG_IN_DB=true` esté configurado para que las imágenes se guarden en la base de datos.

## Solución de Problemas

### Las imágenes no se guardan en la base de datos

- Verifica que `STORE_PNG_IN_DB=true` esté en tu archivo `.env`
- Verifica la conexión a PostgreSQL
- Revisa los logs del servidor para errores

### Error de conexión a PostgreSQL

- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en las variables de entorno
- Verifica que la base de datos exista

### La descarga automática no funciona

- Verifica que la variable `PNG_DOWNLOAD_CRON` esté configurada correctamente
- Revisa los logs del servidor
- Verifica que las URLs remotas de radar estén configuradas

