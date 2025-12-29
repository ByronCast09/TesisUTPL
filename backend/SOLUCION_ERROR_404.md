# 🔧 Solución: Error 404 en el Visor

## 🔍 Diagnóstico

Si ves un error 404 y no hay fechas, puede ser por:

1. **No hay datos en PostgreSQL** (más probable)
2. **El endpoint no está funcionando**
3. **Problema de configuración**

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar que hay datos en PostgreSQL

Ejecuta el script de diagnóstico:

```bash
cd backend
node scripts/diagnosticar_visor.js
```

Este script te dirá:
- ✅ Si PostgreSQL está conectado
- ✅ Si hay PNGs en la base de datos
- ✅ Cuántas fechas hay disponibles

### Paso 2: Si NO hay datos en PostgreSQL

**Opción A: Esperar sincronización automática**

Si `ENABLE_PNG_SYNC=true` está configurado, el servidor descargará PNGs automáticamente cada 5 minutos.

**Opción B: Forzar sincronización manual**

```bash
# Descargar PNGs de los últimos 7 días
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=7"

# O descargar todos los PNGs disponibles
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs"
```

O usando el script:

```bash
cd backend
node scripts/probar_descarga_pngs.js LGUAXX recent 7
```

### Paso 3: Verificar que el endpoint funciona

Prueba el endpoint directamente:

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

**Si funciona**, deberías ver un JSON con `success: true` y un array `index`.

**Si da 404**, verifica:
- Que el servidor esté corriendo
- Que la ruta esté correcta
- Revisa los logs del servidor

### Paso 4: Verificar configuración del frontend

Asegúrate de que `VITE_API_URL` esté configurado correctamente:

En el archivo `.env` del frontend (o `env.example`):

```env
VITE_API_URL=http://localhost:5000/api
```

O verifica en `radarService.js` que `API_URL` esté correcto.

---

## 🧪 Pruebas Rápidas

### 1. Verificar que hay PNGs en PostgreSQL

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs?limit=5
```

Si devuelve PNGs, entonces hay datos.

### 2. Verificar el endpoint del visor

```bash
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index
```

Debería devolver un JSON con `index` que contiene fechas.

### 3. Verificar desde el navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

## 🔄 Flujo Completo de Solución

```
1. Verificar PostgreSQL
   ↓
2. Verificar que hay datos (diagnosticar_visor.js)
   ↓
3. Si NO hay datos → Forzar sincronización
   ↓
4. Verificar endpoint (curl)
   ↓
5. Verificar frontend (consola del navegador)
   ↓
6. Reiniciar servidor si es necesario
```

---

## ❓ Preguntas Frecuentes

### ¿Por qué no hay fechas?

**Causa más común**: No hay PNGs sincronizados en PostgreSQL todavía.

**Solución**: 
1. Verifica que `ENABLE_PNG_SYNC=true` esté en `.env`
2. Espera a que la sincronización automática descargue PNGs
3. O ejecuta una sincronización manual

### ¿Por qué el endpoint da 404?

**Posibles causas**:
1. El servidor no está corriendo
2. La ruta está mal escrita
3. El controlador no está exportado correctamente

**Solución**: 
1. Verifica que el servidor esté corriendo: `npm start` en `backend/`
2. Revisa los logs del servidor para errores
3. Prueba el endpoint con curl

### ¿Cómo sé si la sincronización está funcionando?

Revisa los logs del servidor. Deberías ver cada 5 minutos:

```
[png-sync] Iniciando sincronización para LGUAXX...
[png-sync] ✓ PNG sincronizado: ...
```

---

## ✅ Checklist de Verificación

- [ ] PostgreSQL está corriendo
- [ ] `STORE_PNG_IN_DB=true` en `.env`
- [ ] `ENABLE_PNG_SYNC=true` en `.env`
- [ ] Servidor backend está corriendo
- [ ] Hay PNGs en PostgreSQL (verificar con diagnóstico)
- [ ] El endpoint responde (probar con curl)
- [ ] `VITE_API_URL` está configurado en frontend

---

## 🚀 Solución Rápida

Si quieres una solución inmediata:

```bash
# 1. Verificar configuración
cd backend
node scripts/diagnosticar_visor.js

# 2. Si no hay datos, forzar sincronización
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=7"

# 3. Verificar que funcionó
curl http://localhost:5000/api/radar/LGUAXX/pngs/viewer-index

# 4. Recargar el visor en el navegador
```

---

## 📝 Resumen

**Error 404 + Sin fechas = No hay datos en PostgreSQL**

**Solución**: Sincronizar PNGs desde la PC remota a PostgreSQL local.


