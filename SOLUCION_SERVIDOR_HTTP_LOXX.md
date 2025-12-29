# 🔧 Solución: Servidor HTTP LOXX - Paso a Paso

## 🔍 Diagnóstico del Problema

El error `ECONNREFUSED` significa que la PC local no puede conectarse al servidor HTTP en la PC remota.

## ✅ Checklist de Verificación

### 1. Verificar que el Servidor HTTP está Corriendo (PC REMOTA)

En la PC remota, verifica que veas esto en la ventana del servidor:

```
Servidor LOXX iniciado en puerto 8080
Directorio de datos: F:\LOXX\PNG_OUTPUT
Acceso: http://localhost:8080
API endpoints:
  - http://localhost:8080/api/radar/index
  - http://localhost:8080/api/radar/latest
```

**Si NO ves esto:**
- El servidor no está corriendo
- Ejecuta: `start_loxx_server.bat`

### 2. Verificar que el Servidor Responde Localmente (PC REMOTA)

En la PC remota, abre un navegador y prueba:

```
http://localhost:8080/api/radar/index
```

**Debe mostrar un JSON.** Si no muestra nada:
- El servidor no está funcionando correctamente
- Revisa los logs del servidor

### 3. Verificar la IP de la PC Remota

En la PC remota, ejecuta:

```bash
ipconfig
```

**Busca:**
- Si usas **Tailscale**: Busca "Adaptador de Tailscale" → Dirección IPv4 (ej: `100.100.81.47`)
- Si NO usas Tailscale: Busca "Adaptador de Ethernet" o "Wi-Fi" → Dirección IPv4 (ej: `192.168.1.100`)

**Anota esta IP** - la necesitarás en el paso 4.

### 4. Verificar la Configuración en PC Local

En tu PC local, edita `backend/.env` y verifica:

```env
# URL debe ser la IP que encontraste en el paso 3
RADAR_LOXX_URL=http://[IP_DE_PC_REMOTA]:8080

# Ejemplo con Tailscale:
# RADAR_LOXX_URL=http://100.100.81.47:8080

# Ejemplo sin Tailscale:
# RADAR_LOXX_URL=http://192.168.1.100:8080
```

**⚠️ IMPORTANTE:** 
- NO uses `localhost` o `127.0.0.1` (solo funciona en la misma PC)
- Usa la IP real de la PC remota

### 5. Verificar Firewall en PC Remota

El firewall de Windows puede estar bloqueando el puerto 8080.

**Solución rápida (PC REMOTA):**

Abre PowerShell como Administrador y ejecuta:

```powershell
netsh advfirewall firewall add rule name="LOXX Server HTTP" dir=in action=allow protocol=TCP localport=8080
```

O manualmente:
1. Abre "Firewall de Windows con seguridad avanzada"
2. Clic en "Reglas de entrada" → "Nueva regla"
3. Tipo: **Puerto** → Siguiente
4. Protocolo: **TCP** → Puertos locales específicos: **8080** → Siguiente
5. Acción: **Permitir la conexión** → Siguiente
6. Perfiles: Marca **todos** (Dominio, Privada, Pública) → Siguiente
7. Nombre: "LOXX Server HTTP" → Finalizar

### 6. Verificar Conectividad de Red

**Desde PC LOCAL, prueba:**

```bash
# Reemplaza [IP_PC_REMOTA] con la IP real
ping [IP_PC_REMOTA]
```

**Debe responder.** Si no responde:
- Verifica que ambas PCs estén en la misma red (o Tailscale conectado)
- Verifica que la IP sea correcta

### 7. Probar Conexión HTTP desde PC Local

**Desde PC LOCAL, prueba:**

```bash
# Reemplaza [IP_PC_REMOTA] con la IP real
curl http://[IP_PC_REMOTA]:8080/api/radar/index
```

**O en el navegador:**
```
http://[IP_PC_REMOTA]:8080/api/radar/index
```

**Si funciona:** Verás un JSON. El servidor es accesible.

**Si NO funciona:**
- Revisa el firewall (paso 5)
- Verifica la IP (paso 3)
- Verifica que el servidor esté corriendo (paso 1)

### 8. Verificar Configuración del Servidor

El servidor debe estar escuchando en **todas las interfaces** (`0.0.0.0`), no solo en `localhost`.

**Verifica en `radar_server_loxx.py` línea 237:**

```python
self.server = HTTPServer(('0.0.0.0', self.port), handler)
```

**Debe decir `0.0.0.0`**, NO `127.0.0.1` o `localhost`.

### 9. Reiniciar Servicios

**En PC REMOTA:**
1. Detén el servidor HTTP (Ctrl+C)
2. Vuelve a iniciarlo: `start_loxx_server.bat`

**En PC LOCAL:**
1. Detén el servidor backend (Ctrl+C)
2. Vuelve a iniciarlo: `npm start`

### 10. Verificar Logs

**En PC LOCAL, revisa los logs del servidor backend:**

Deberías ver:
```
[png-sync] Sincronizando PNGs para LOXX...
[png-sync] Consultando índice remoto...
[png-sync] Encontrados X PNGs nuevos
[png-sync] Descargando PNG: LOXX_20250718_000000.png
[png-sync] ✓ PNG sincronizado: LOXX_20250718_000000.png (ID: 123)
```

**Si ves errores:**
- Copia el mensaje de error completo
- Verifica los pasos anteriores

## 🎯 Resumen de Pasos Críticos

1. ✅ Servidor HTTP corriendo en PC remota (`start_loxx_server.bat`)
2. ✅ Servidor responde en `http://localhost:8080/api/radar/index` (desde PC remota)
3. ✅ IP correcta en `RADAR_LOXX_URL` en `backend/.env` (PC local)
4. ✅ Firewall permite puerto 8080 (PC remota)
5. ✅ Conectividad de red (ping funciona)
6. ✅ Servidor escuchando en `0.0.0.0` (no solo localhost)

## 🐛 Solución de Problemas Específicos

### Error: "connect ECONNREFUSED"

**Causa:** El servidor no está corriendo o el firewall lo bloquea.

**Solución:**
1. Verifica que el servidor esté corriendo (paso 1)
2. Abre el firewall (paso 5)
3. Verifica la IP (paso 3)

### Error: "timeout"

**Causa:** Problema de red o firewall bloqueando.

**Solución:**
1. Verifica conectividad (paso 6)
2. Verifica firewall (paso 5)
3. Verifica que ambas PCs estén en la misma red

### Error: "ENOTFOUND" o "getaddrinfo failed"

**Causa:** IP incorrecta o hostname no resuelve.

**Solución:**
1. Verifica la IP real de la PC remota (paso 3)
2. Actualiza `RADAR_LOXX_URL` en `.env` (paso 4)
3. Usa IP numérica, no hostname

## ✅ Verificación Final

Ejecuta este script de diagnóstico en PC LOCAL:

```bash
cd backend
node scripts/verificar_conexion_loxx.js
```

Debería mostrar:
```
✓ Conexión exitosa
El servidor LOXX remoto es accesible.
La sincronización debería funcionar correctamente.
```


