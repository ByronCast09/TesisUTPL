# 📋 Instrucciones Simples - Descarga Automática de PNGs

## ✅ Lo que YA está hecho (automático)

**¡La automatización YA está configurada!** Cuando inicies el servidor, automáticamente:
- Se conecta a PostgreSQL
- Descarga PNGs cada hora
- Los guarda en la base de datos

**NO necesitas ejecutar POSTs manualmente** a menos que quieras descargar algo específico ahora mismo.

---

## 🔧 Configuración en tu PC Remota (Solo una vez)

### Paso 1: Editar archivo `.env`

Abre el archivo `backend/.env` y asegúrate de tener estas líneas:

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=tu_base_de_datos

# IMPORTANTE: Activar esto
STORE_PNG_IN_DB=true

# URLs remotas (ya deberías tenerlas)
RADAR_LGUAXX_URL=http://tu-servidor:8080
RADAR_LOXX_URL=http://tu-servidor:8080
```

### Paso 2: Iniciar el servidor

En tu PC remota, abre una terminal y ejecuta:

```bash
cd backend
npm start
```

**¡Eso es todo!** El servidor ahora:
- ✅ Se conecta a PostgreSQL
- ✅ Crea las tablas si no existen
- ✅ Inicia la descarga automática cada hora

Verás en la consola:
```
[png-download] Tarea programada para descargar PNGs: 0 * * * *
Servidor ejecutándose en el puerto 5000
```

---

## 🎯 ¿Cómo funciona la automatización?

1. **El servidor se inicia** → Lee la configuración
2. **Cada hora** (a las 00:00, 01:00, 02:00, etc.) → Descarga PNGs automáticamente
3. **Los guarda en PostgreSQL** → Sin que tengas que hacer nada

**No necesitas hacer POSTs manuales.** Todo es automático.

---

## 🔍 Verificar que funciona

### Opción 1: Ver logs del servidor

Cuando el servidor está corriendo, cada hora verás:

```
[png-download] Iniciando descarga automática de PNGs: 2025-01-24T12:00:00Z
[png-download] Descargando PNGs recientes para LGUAXX...
PNG guardado en PostgreSQL: LGUAXX_20250124_120000.png (ID: 123)
[png-download] LGUAXX: 12 descargados, 3 omitidos
[png-download] Tarea completada en 45.2s
```

### Opción 2: Usar el script de verificación

```bash
cd backend
node scripts/verificar_automatizacion.js
```

O en Windows:
```bash
cd backend\scripts
verificar_configuracion.bat
```

---

## 🚀 Si quieres descargar algo AHORA (opcional)

Si no quieres esperar a la próxima hora, puedes ejecutar una descarga manual:

### Opción A: Usar el script (más fácil)

```bash
cd backend
node scripts/probar_descarga_pngs.js LGUAXX recent
```

O en Windows:
```bash
cd backend\scripts
probar_descarga.bat LGUAXX recent
```

### Opción B: Usar curl

```bash
curl -X POST "http://localhost:5000/api/radar/LGUAXX/download-pngs/recent?days=7"
```

### Opción C: Usar Postman

1. Método: **POST**
2. URL: `http://localhost:5000/api/radar/LGUAXX/download-pngs/recent`
3. Query params: `days=7`
4. Click en "Send"

---

## 📊 Ver PNGs guardados

### Desde el navegador:

```
http://localhost:5000/api/radar/LGUAXX/pngs/index
```

### Ver una imagen específica:

Primero obtén el ID desde el endpoint anterior, luego:
```
http://localhost:5000/api/radar/pngs/1/image
```

---

## ❓ Preguntas Frecuentes

### ¿Dónde ejecuto el POST?

**No necesitas ejecutar POSTs.** La automatización lo hace sola cada hora.

Si quieres descargar algo ahora mismo, usa el script o curl (ver arriba).

### ¿Cómo hago que la PC remota lo haga automáticamente?

**Ya está hecho automáticamente.** Solo necesitas:
1. Configurar `.env` con PostgreSQL y `STORE_PNG_IN_DB=true`
2. Iniciar el servidor con `npm start`
3. Dejarlo corriendo

El servidor se encarga de todo.

### ¿Cada cuánto se descarga?

**Por defecto: cada hora** (a las 00:00, 01:00, 02:00, etc.)

Puedes cambiarlo editando `PNG_DOWNLOAD_CRON` en `.env`:
- `0 * * * *` = Cada hora
- `*/30 * * * *` = Cada 30 minutos
- `0 */2 * * *` = Cada 2 horas

### ¿Cómo sé si está funcionando?

1. **Revisa los logs del servidor** - Verás mensajes cada hora
2. **Ejecuta el script de verificación** - Te dirá si falta algo
3. **Consulta la API** - `http://localhost:5000/api/radar/LGUAXX/pngs/index`

### ¿Necesito mantener el servidor corriendo?

**Sí.** El servidor debe estar corriendo para que la automatización funcione.

Si cierras el servidor, la automatización se detiene. Al reiniciarlo, vuelve a funcionar.

---

## 📝 Resumen

1. ✅ **Configura `.env`** con PostgreSQL y `STORE_PNG_IN_DB=true`
2. ✅ **Inicia el servidor** con `npm start`
3. ✅ **¡Listo!** La descarga automática funciona cada hora
4. ✅ **No necesitas hacer POSTs** - Todo es automático

**La PC remota solo necesita tener el servidor corriendo.** El resto es automático.

