# 🔍 Diagnóstico: Visor No Muestra Datos

## ❌ Problema

El visor se abre pero no muestra imágenes de radar.

---

## 🔍 Pasos de Diagnóstico

### Paso 1: Verificar que el Backend está Corriendo

Abre en el navegador:
```
http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

**Deberías ver un JSON** con la estructura:
```json
{
  "success": true,
  "radar": "LGUAXX",
  "source": "postgresql",
  "index": [
    {
      "date": "2025-11-28",
      "png": [
        {
          "name": "LGUAXX_20251128_003002.png",
          "url": "http://localhost:5000/api/radar/pngs/123/image",
          ...
        }
      ]
    }
  ]
}
```

**Si no ves datos:**
- El backend no está corriendo, O
- No hay datos en PostgreSQL

---

### Paso 2: Verificar que hay Datos en PostgreSQL

Conecta a PostgreSQL y verifica:

```sql
-- Conectar
psql -U postgres -d radar_metadata

-- Ver cuántos PNGs hay
SELECT COUNT(*) FROM radar_products WHERE product_type = 'ppi_png';

-- Ver los últimos PNGs subidos
SELECT id, filename, source_timestamp, created_at 
FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX'
ORDER BY created_at DESC 
LIMIT 10;

-- Ver fechas disponibles
SELECT DISTINCT DATE(source_timestamp) as fecha
FROM radar_products 
WHERE product_type = 'ppi_png' 
  AND radar_id = 'LGUAXX'
ORDER BY fecha DESC;
```

**Si no hay datos:**
- Los PNGs no se han subido a PostgreSQL
- Necesitas ejecutar el conversor con `--db-url`

---

### Paso 3: Verificar la Consola del Navegador

1. Abre el visor en el navegador
2. Presiona `F12` para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Busca errores en rojo

**Errores comunes:**
- `Failed to fetch` → El backend no está corriendo o hay problema de CORS
- `404 Not Found` → La API no encuentra el endpoint
- `Network Error` → Problema de conexión

---

### Paso 4: Verificar la Pestaña Network

1. En las herramientas de desarrollador, ve a la pestaña **Network**
2. Recarga la página (F5)
3. Busca peticiones a `/api/radar/...`

**Verifica:**
- ¿Se están haciendo peticiones a la API?
- ¿Qué código de respuesta tienen? (200 = OK, 404 = No encontrado, 500 = Error del servidor)
- ¿Las peticiones están fallando?

---

### Paso 5: Verificar Variables de Entorno del Frontend

Verifica que el archivo `.env` en `tesis_utpl/` tiene:

```env
VITE_API_URL=http://localhost:5000/api
```

**Si cambiaste el `.env`, reinicia el servidor de desarrollo:**
```bash
# Detener (Ctrl+C) y volver a iniciar
npm start
```

---

### Paso 6: Verificar que el Backend Consulta PostgreSQL Correctamente

En el backend, verifica que las variables de entorno están configuradas:

**Archivo:** `tesis_utpl/backend/.env`

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=radar_metadata
```

**Reinicia el backend** después de cambiar el `.env`:
```bash
cd backend
npm start
```

---

## 🔧 Soluciones Comunes

### Problema 1: No hay Datos en PostgreSQL

**Solución:** Sube datos a PostgreSQL ejecutando el conversor:

```powershell
python advanced_ppi_converter.py `
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" `
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" `
    --radar-id LGUAXX `
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

### Problema 2: Backend No Está Corriendo

**Solución:** Inicia el backend:

```bash
cd tesis_utpl/backend
npm start
```

Debería mostrar:
```
Server running on port 5000
```

### Problema 3: Frontend No Está Corriendo

**Solución:** Inicia el frontend:

```bash
cd tesis_utpl
npm start
```

Debería abrir en `http://localhost:5173`

### Problema 4: CORS Error

**Solución:** Verifica que el backend tiene CORS habilitado. En `backend/server.js` debería estar:

```javascript
app.use(cors());
```

### Problema 5: Variables de Entorno Incorrectas

**Solución:** Verifica que:
- `VITE_API_URL` en el frontend apunta al backend correcto
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en el backend son correctos

---

## 🧪 Prueba Rápida: Verificar Todo el Flujo

### 1. Verificar PostgreSQL tiene datos:
```sql
SELECT COUNT(*) FROM radar_products WHERE product_type = 'ppi_png';
```

### 2. Verificar Backend responde:
```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

### 3. Verificar Frontend puede acceder:
- Abre: `http://localhost:5173`
- Abre consola (F12)
- Busca errores

---

## 📋 Checklist Completo

- [ ] PostgreSQL está corriendo
- [ ] Hay datos en PostgreSQL (verificar con SQL)
- [ ] Backend está corriendo en puerto 5000
- [ ] Backend puede conectarse a PostgreSQL (verificar logs)
- [ ] API responde: `http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index`
- [ ] Frontend está corriendo en puerto 5173
- [ ] `VITE_API_URL` está configurado correctamente
- [ ] No hay errores en la consola del navegador
- [ ] Las peticiones en Network tienen código 200

---

## 🔍 Comandos de Diagnóstico Rápido

### Verificar Backend:
```bash
# Verificar que está corriendo
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index

# Ver logs del backend
# (deberías ver las peticiones en la consola donde corre el backend)
```

### Verificar PostgreSQL:
```sql
-- Verificar conexión
SELECT version();

-- Verificar datos
SELECT COUNT(*) FROM radar_products WHERE product_type = 'ppi_png';
```

### Verificar Frontend:
```javascript
// En la consola del navegador (F12)
fetch('http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index')
  .then(r => r.json())
  .then(data => console.log('Datos:', data))
  .catch(err => console.error('Error:', err));
```

---

## 🆘 Si Nada Funciona

1. **Verifica los logs del backend** - Deberían mostrar errores si los hay
2. **Verifica los logs del frontend** - Consola del navegador (F12)
3. **Verifica la conexión a PostgreSQL** desde el backend
4. **Verifica que los datos están en PostgreSQL** con SQL directo

---

*Última actualización: Diagnóstico de visor sin datos*


