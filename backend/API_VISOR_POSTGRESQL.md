# 🔌 API para Conectar el Visor con PostgreSQL

Esta documentación describe los endpoints de API para que el visor acceda a los PNGs almacenados en PostgreSQL local.

## 📋 Endpoints Disponibles

### 1. Obtener Índice de PNGs (Formato para Visor)

**GET** `/api/radar/:radarId/pngs/viewer-index`

Obtiene el índice de PNGs desde PostgreSQL en formato compatible con el visor.

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

**Respuesta:**
```json
{
  "success": true,
  "radar": "LGUAXX",
  "source": "postgresql",
  "index": [
    {
      "date": "2025-01-24",
      "png": [
        {
          "name": "LGUAXX_20250124_120000.png",
          "file": "LGUAXX_20250124_120000.png",
          "filename": "LGUAXX_20250124_120000.png",
          "url": "http://localhost:5000/api/radar/pngs/123/image",
          "id": 123,
          "timestamp": "2025-01-24T12:00:00Z",
          "size": 245678,
          "metadata": {}
        }
      ],
      "nc": []
    }
  ]
}
```

### 2. Obtener Imagen PNG desde PostgreSQL

**GET** `/api/radar/pngs/:id/image`

Obtiene la imagen PNG almacenada en PostgreSQL.

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/pngs/123/image -o imagen.png
```

O en HTML:
```html
<img src="http://localhost:5000/api/radar/pngs/123/image" alt="Radar" />
```

### 3. Obtener Lista de PNGs

**GET** `/api/radar/:radarId/pngs?date=YYYY-MM-DD&limit=100`

Obtiene la lista de PNGs con metadatos.

**Ejemplo:**
```bash
curl "http://localhost:5000/api/radar/LGUAXX/pngs?date=2025-01-24&limit=50"
```

### 4. Obtener Fechas Disponibles

**GET** `/api/radar/:radarId/pngs/index`

Obtiene el índice organizado por fecha.

**Ejemplo:**
```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/index
```

---

## 🎨 Uso en el Visor (Frontend)

### Opción 1: Usar el servicio existente

El servicio `radarService.js` ya tiene la función:

```javascript
import { getPngIndexFromDbForViewer, getPngImageUrl } from '@/services/radarService';

// Obtener índice desde PostgreSQL
const indexData = await getPngIndexFromDbForViewer('LGUAXX');

// Usar en el visor
indexData.index.forEach(dateEntry => {
  dateEntry.png.forEach(png => {
    // png.url ya contiene la URL completa para acceder a la imagen
    console.log(`Imagen: ${png.name}, URL: ${png.url}`);
  });
});
```

### Opción 2: Modificar el visor para usar PostgreSQL

En lugar de usar `getRemoteIndex`, usa `getPngIndexFromDbForViewer`:

```javascript
// Antes (desde PC remota):
const remoteIndex = await getRemoteIndex(radarId);

// Ahora (desde PostgreSQL local):
const dbIndex = await getPngIndexFromDbForViewer(radarId);

// El formato es compatible, puedes usar el mismo código
```

---

## 🔄 Flujo Completo

```
1. PC Remota: PPI → PNG → Sube a PostgreSQL remota
2. PC Local: Sincroniza PNGs → Descarga → Sube a PostgreSQL local
3. Visor: Consulta API → Obtiene índice desde PostgreSQL local → Muestra imágenes
```

---

## 📊 Comparación de Endpoints

| Endpoint | Fuente | Formato |
|----------|--------|---------|
| `/api/radar/:radarId/remote-index` | PC Remota | Compatible con visor |
| `/api/radar/:radarId/pngs/viewer-index` | PostgreSQL Local | Compatible con visor |
| `/api/radar/:radarId/pngs/index` | PostgreSQL Local | Formato simplificado |

**Recomendación**: Usa `/pngs/viewer-index` para el visor porque tiene el mismo formato que `remote-index`.

---

## ✅ Ventajas de Usar PostgreSQL

1. **Más rápido**: No necesita descargar desde PC remota cada vez
2. **Más confiable**: Datos locales, no depende de conexión remota
3. **Búsquedas**: Puedes filtrar por fecha, timestamp, etc.
4. **Metadata**: Toda la información está en la base de datos

---

## 🔧 Configuración del Visor

Para que el visor use PostgreSQL en lugar de la PC remota, puedes:

1. **Modificar el componente del visor** para usar `getPngIndexFromDbForViewer`
2. **O crear un toggle** para elegir entre remoto y local

Ejemplo de toggle:

```javascript
const [useLocalDb, setUseLocalDb] = useState(true);

const loadIndex = async () => {
  if (useLocalDb) {
    // Desde PostgreSQL local
    const data = await getPngIndexFromDbForViewer(radarId);
    return data.index;
  } else {
    // Desde PC remota
    const data = await getRemoteIndex(radarId);
    return data.index;
  }
};
```

---

## 📝 Resumen

1. ✅ **Los PNGs se suben directamente a PostgreSQL** (sí, confirmado)
2. ✅ **API disponible**: `/api/radar/:radarId/pngs/viewer-index`
3. ✅ **Formato compatible** con el visor existente
4. ✅ **Función en radarService.js**: `getPngIndexFromDbForViewer()`

**El visor puede acceder a todos los PNGs desde PostgreSQL local usando estos endpoints.**


