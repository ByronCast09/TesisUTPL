# Pipeline de ingestión y visualización de radares (.h5 → PNG)

Esta guía describe la arquitectura integral para:

1. **Tomar automáticamente** los archivos `.h5` generados cada 5 minutos en la PC remota.
2. **Procesarlos en la PC local** (servidor Node.js + Python) para generar imágenes PNG/GIF con transparencia y metadatos JSON.
3. **Servir las imágenes** mediante Express y exponer endpoints REST para el visor React.
4. **Mantener la retención** de los últimos datos (24 h por defecto) y subirlos opcionalmente a Firebase Storage.

La solución utiliza los servicios nuevos ubicados en `backend/services/*Pipeline*` y el script `scripts/convert_h5_to_png.py`.

---

## 1. Requisitos previos

- PC remota (Windows/Linux) con servicio SFTP disponible y carpeta accesible con los `.h5`.
- PC local (servidor) con Node.js 18+, Python 3.9+ y librerías: `h5py`, `numpy`, `matplotlib`, `pillow`.
- (Opcional) Proyecto de Firebase habilitado y credenciales de servicio si se desea subir a la nube.

Instalación de dependencias Python:

```bash
pip install h5py numpy pillow matplotlib
```

---

## 2. Variables de entorno del backend

Crear `tesis_utpl/backend/.env` con:

```ini
# Conexión SFTP a la PC remota
RADAR_PIPELINE_REMOTE_HOST=192.168.1.10
RADAR_PIPELINE_REMOTE_PORT=22
RADAR_PIPELINE_REMOTE_USER=usuario
RADAR_PIPELINE_REMOTE_PASSWORD=clave
# o RADAR_PIPELINE_REMOTE_KEY_PATH=C:\Users\...\id_rsa

# Directorios remotos por radar (formato ID:path;ID2:path2)
RADAR_PIPELINE_RADARS=LGUAXX:/data/radar/LGUAXX;LOXX:/data/radar/LOXX
# Lista de radares a procesar (si no se infiere de RADAR_PIPELINE_RADARS)
RADAR_PIPELINE_RADAR_IDS=LGUAXX,LOXX

# Parámetros de procesamiento
RADAR_PIPELINE_VMIN=0
RADAR_PIPELINE_VMAX=60
RADAR_PIPELINE_TRANSPARENT_BELOW=1
RADAR_PIPELINE_COLORMAP=turbo

# Retención y scheduling
RADAR_PIPELINE_RETENTION_HOURS=24
RADAR_PIPELINE_CRON=*/5 * * * *

# Bounds por defecto (global o por radar)
# RADAR_PIPELINE_DEFAULT_BOUNDS=latMin,latMax,lonMin,lonMax
# RADAR_PIPELINE_BOUNDS_PER_RADAR=LGUAXX:-1.2,1.0,-79.5,-78.0;LOXX:-4.5,-2.0,-80.5,-78.2

# (Opcional) Firebase
RADAR_PIPELINE_FIREBASE_ENABLED=true
FIREBASE_SERVICE_ACCOUNT=../firebase-key.json
FIREBASE_STORAGE_BUCKET=mi-proyecto.appspot.com
RADAR_PIPELINE_FIREBASE_PREFIX=radar
# RADAR_PIPELINE_FIREBASE_UPLOAD_H5=true  # Para subir también el archivo original
```

La salida local se guarda en:

- Crudos: `backend/storage/raw/<RADAR>/<YYYY>/<MM>/<DD>/archivo.h5`
- Procesados: `backend/public/radar-images/<RADAR>/<YYYY-MM-DD>/<archivo>.png|json`

Express expone los PNG en `http://localhost:5000/radar-images/...`.

---

## 3. Flujo automático (cada 5 minutos)

1. **Descarga SFTP** (`fileTransferService`):
   - Se conecta con las credenciales configuradas.
   - Descarga solo el archivo más reciente sin reprocesar duplicados.
   - Actualiza `storage/pipeline-state.json`.

2. **Conversión Python** (`h5ProcessingService`):
   - Ejecuta `scripts/convert_h5_to_png.py` con los parámetros configurados.
   - Genera PNG con transparencia, colormap configurable y metadatos JSON.

3. **Registro y limpieza** (`pipelineStorageService`):
   - Mueve los resultados al árbol `public/radar-images`.
   - Actualiza `storage/pipeline-index.json` (timeline).
   - Aplica retención automática a procesados y crudos (24 h por defecto).

4. **Subida a Firebase (opcional)** (`firebaseService`):
   - Sube PNG/JSON (y opcionalmente el `.h5`) a Storage.
   - Devuelve URLs firmadas de 30 días para consumo remoto.

5. **Scheduler** (`scheduledTasks.js`):
   - Usa `node-schedule` y respeta `RADAR_PIPELINE_CRON`.
   - Loggea el resultado de cada radar (`processed`, `no-new-files`, `error`).

---

## 4. Endpoints relevantes

- `GET  /api/radar/pipeline/status`  
  Estado del pipeline, últimos archivos procesados y configuración.

- `POST /api/radar/pipeline/run`  
  Ejecuta el pipeline manualmente (útil para pruebas o reintentos).

- `GET  /api/radar/:radarId/latest-image`  
  Devuelve la entrada más reciente (PNG, JSON local y URLs Firebase si existen).

- `GET  /api/radar/:radarId/timeline?limit=48`  
  Lista ordenada de las últimas capturas (por defecto 24 h ≈ 288 elementos).

Los PNG se sirven directamente desde `/radar-images/...`, por lo que el visor React puede consumir `entry.local.publicPng` como `ImageOverlay` o animación.

---

## 5. Integración con el visor React

1. Consumir `GET /api/radar/LGUAXX/latest-image` y mostrar `entry.local.publicPng`.
2. Para animaciones, construir un `ImageOverlay` o `<img>` con cada `timeline[i].local.publicPng`.
3. Opcional: si se usan URLs de Firebase, priorizar `entry.firebase.png.url`.

Ejemplo de respuesta resumida:

```json
{
  "success": true,
  "radar": "LGUAXX",
  "entry": {
    "timestamp": "2025-11-10T18:25:00Z",
    "local": {
      "publicPng": "/radar-images/LGUAXX/2025-11-10/LGUAXX_20251110_182500.png"
    },
    "metadata": {
      "bounds": {
        "southWest": [-4.2, -79.6],
        "northEast": [-3.5, -78.9]
      },
      "stats": { "...": "..." }
    },
    "firebase": {
      "png": { "url": "https://..." }
    }
  }
}
```

---

## 6. Operación y mantenimiento

- **Logs**: revisar consola del backend (`npm run dev`). Cada ciclo imprime estado y errores.
- **Retención**: configurable con `RADAR_PIPELINE_RETENTION_HOURS`. También limpia archivos crudos descargados.
- **Seguridad**: utilizar claves SSH para SFTP y variables de entorno seguras (no versionarlas).
- **Monitoreo**: conectar los logs a un servicio (Papertrail, Grafana Loki, etc.) para alertas si falla la descarga o conversión.
- **Escalabilidad**: el pipeline se puede contenerizar. Use `docker-compose` con servicios para backend, worker Python y Redis si se requiere cola avanzada.

---

## 7. Troubleshooting

| Problema                                   | Posible causa / solución                                             |
|-------------------------------------------|----------------------------------------------------------------------|
| No se descarga ningún archivo             | Verificar credenciales SFTP, rutas en `RADAR_PIPELINE_RADARS` y permisos. |
| Error ejecutando Python                   | Confirmar que `scripts/convert_h5_to_png.py` tiene dependencias instaladas y `RADAR_PIPELINE_PYTHON` apunta al interprete correcto. |
| PNG sin transparencia o colores extraños  | Ajustar `RADAR_PIPELINE_TRANSPARENT_BELOW`, `RADAR_PIPELINE_VMIN`/`VMAX`, o `RADAR_PIPELINE_COLORMAP`. |
| Bounds nulos                              | Proveer `RADAR_PIPELINE_DEFAULT_BOUNDS` o `RADAR_PIPELINE_BOUNDS_PER_RADAR`. |
| Pipeline no corre automáticamente         | Revisar `RADAR_PIPELINE_CRON` y que el backend se esté ejecutando (`npm run dev`). |
| Subida a Firebase falla                   | Validar credenciales de servicio, bucket y permisos `storage.objects.create`. |

---

## 8. Próximos pasos sugeridos

- Añadir generación automática de GIFs a partir de los últimos `N` PNG.
- Integrar notificaciones (Discord/Slack) cuando falle un ciclo de ingestión.
- Incorporar métricas Prometheus o Health-check para monitoreo continuo.