# Guía Rápida: Activar Optimizaciones de Escalabilidad

## ✅ Ya Instalado

Las siguientes optimizaciones ya están implementadas en tu código:

1. **Connection Pool de PostgreSQL** con 50 conexiones máximas
2. **Compresión HTTP** (reduce ancho de banda 70-90%)
3. **Rate Limiting** (protección contra abuso)
4. **Scripts de optimización de índices**

## 🚀 Pasos para Activar

### Paso 1: Optimizar Base de Datos (Una vez)

Ejecuta este comando para crear índices optimizados en PostgreSQL:

```bash
cd C:\Users\Usuario iTC\Desktop\TesisUTPL\tesis_utpl\backend
node scripts/optimize_database.js
```

Este proceso toma 10-30 segundos y solo necesita ejecutarse una vez (o después de limpiar la base de datos).

### Paso 2: Reiniciar el Backend

Para activar las optimizaciones, reinicia el servidor backend:

**Opción A - Desde la terminal de VSCode:**
1. Presiona `Ctrl+C` en la terminal del backend
2. Ejecuta: `npm start`

**Opción B - Matar y reiniciar:**
```bash
# En Git Bash o PowerShell
cd C:\Users\Usuario iTC\Desktop\TesisUTPL\tesis_utpl\backend
npm start
```

### Paso 3: Verificar Activación

Al reiniciar, deberías ver estos mensajes en la consola:

```
[DB Pool] Inicializado con max=50, min=5
[Optimización] Compresión HTTP habilitada (nivel 6)
[Optimización] Rate limiting habilitado (max 100 req/15min)
```

## ⚙️ Configuración Opcional

Si quieres personalizar los valores, agrega estas líneas a tu archivo `.env`:

```env
# Connection Pool PostgreSQL
DB_POOL_MAX=50
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Compresión HTTP
ENABLE_COMPRESSION=true
COMPRESSION_LEVEL=6

# Rate Limiting
ENABLE_RATE_LIMIT=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15
```

> ⚠️ **NOTA**: No necesitas agregar estas variables a `.env` porque ya tienen valores por defecto. Solo personaliza si necesitas valores diferentes.

## 🧪 Cómo Probar

### Prueba 1: Verificar Compresión

Abre el navegador y ve a:
```
http://localhost:5000/api/radar/LOXX/pngs/viewer-frames
```

Abre DevTools (F12) → Network → Mira el header `Content-Encoding: gzip`

### Prueba 2: Verificar Rate Limiting

Recarga la página 101 veces en 15 minutos. Deberías recibir:
```json
{
  "message": "Demasiadas peticiones desde esta IP, intenta más tarde"
}
```

### Prueba 3: Monitor de Pool

Los logs mostrarán cuando se adquieran conexiones del pool:
```
[DB Pool] Cliente adquirido del pool
[DB Pool] Nueva conexión establecida
```

## 📊 Resultados Esperados

| Métrica | Antes | Después |
|---------|-------|---------|
| Usuarios simultáneos | 5-10 | 50-100 |
| Tiempo respuesta API | 500-2000ms | 50-200ms |
| Ancho de banda | 100% | 10-30% |
| Conexiones BD | 1 por request | Pool reutilizable |

## ❓ Solución de Problemas

### Error: "Cannot find module 'compression'"

Ejecuta:
```bash
cd backend
npm install
```

### Las optimizaciones no aparecen en logs

Verifica que reiniciaste el servidor correctamente y no estés viendo logs viejos.

### El visor no carga

Las optimizaciones no afectan el frontend. Si hay problemas, probablemente sean independientes. Verifica:
```bash
# Ver logs del backend
cd backend
npm start

# Ver logs del frontend (otra terminal)
cd ..
npm start
```

## 🎯 Optimizaciones Futuras (Opcional)

Para soportar aún más usuarios (200+), considera:

1. **Redis Cache**: Requiere instalar Redis
2. **PM2 Clustering**: Multiplica capacidad por número de CPU cores
3. **NGINX**: Para producción, sirve archivos estáticos 10x más rápido

Ver [`escalabilidad_multiples_usuarios.md`](file:///C:/Users/Usuario%20iTC/.gemini/antigravity/brain/464d7711-6520-4c3e-853f-1400d3770e29/escalabilidad_multiples_usuarios.md) para detalles.
