# ⏱️ Configuración de Timeout para LOXX

## 🔧 Problema

El servidor HTTP puede tardar en responder, causando errores de timeout. El timeout por defecto es de 7 segundos, pero puede necesitar más tiempo.

## ✅ Solución

### Opción 1: Configurar en `backend/.env` (Recomendado)

Agrega esta variable en `backend/.env`:

```env
# Timeout para consultas al servidor remoto (en milisegundos)
# Por defecto: 30000 (30 segundos)
# Aumenta si el servidor tarda más en responder
RADAR_REMOTE_INDEX_TIMEOUT_MS=30000
```

**Valores recomendados:**
- `30000` = 30 segundos (recomendado)
- `60000` = 60 segundos (si el servidor es muy lento)
- `45000` = 45 segundos (intermedio)

### Opción 2: Ya está configurado automáticamente

He actualizado el código para usar **30 segundos por defecto** en lugar de 7 segundos. Si reinicias el servidor backend, debería funcionar mejor.

## 🔄 Reiniciar el Servidor

Después de cambiar el timeout, reinicia el servidor backend:

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo:
cd tesis_utpl/backend
npm start
```

## ✅ Verificación

Después de reiniciar, deberías ver en los logs:

```
[png-sync] Sincronizando PNGs para LOXX...
[png-sync] Consultando índice remoto...
[png-sync] Encontrados X PNGs nuevos
```

**Si aún ves timeouts:**
- Aumenta el valor de `RADAR_REMOTE_INDEX_TIMEOUT_MS` a 60000 (60 segundos)
- Verifica que el servidor remoto esté respondiendo correctamente


