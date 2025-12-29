# 🚀 Configuración LOXX SIN Servidor HTTP (Método Directo)

Si antes funcionó sin servidor HTTP, probablemente usaste `PNGUploadService` que monitorea directamente el directorio de PNGs.

## 📋 Configuración en `backend/.env`

```env
# ============================================
# CONFIGURACIÓN DE POSTGRESQL LOCAL
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=radar_metadata
STORE_PNG_IN_DB=true

# ============================================
# MONITOREO AUTOMÁTICO DE PNGs (Método Directo)
# ============================================
# Activar monitoreo de PNGs para subir directamente a PostgreSQL
ENABLE_PNG_UPLOADER=true

# Ruta al directorio de PNGs de LOXX
# OPCIÓN A: Si tienes carpeta compartida en red desde PC remota
PNG_OUTPUT_PATH_LOXX=\\PC_REMOTA\LOXX_PNG_OUTPUT
# O carpeta mapeada:
# PNG_OUTPUT_PATH_LOXX=Z:\LOXX_PNG_OUTPUT

# OPCIÓN B: Si copias los PNGs a la PC local
# PNG_OUTPUT_PATH_LOXX=C:\LOXX\PNG_OUTPUT

# ============================================
# DESACTIVAR SINCRONIZACIÓN HTTP (si no la usas)
# ============================================
ENABLE_PNG_SYNC=false
```

## 🔧 Opción A: Carpeta Compartida en Red

### En PC REMOTA:

1. **Compartir la carpeta:**
   - Clic derecho en `F:\LOXX\PNG_OUTPUT`
   - Propiedades → Compartir → Compartir...
   - Compartir con: "Todos" (o un usuario específico)
   - Permisos: Lectura

2. **Anotar la ruta de red:**
   ```
   \\[NOMBRE_PC_REMOTA]\LOXX_PNG_OUTPUT
   ```
   O la IP:
   ```
   \\100.100.81.47\LOXX_PNG_OUTPUT
   ```

### En PC LOCAL:

1. **Mapear la carpeta compartida:**
   - Abre "Este equipo"
   - Clic derecho → "Conectar unidad de red"
   - Letra: `Z:`
   - Carpeta: `\\[NOMBRE_PC_REMOTA]\LOXX_PNG_OUTPUT`
   - Marcar "Volver a conectar al iniciar sesión"

2. **Configurar en `.env`:**
   ```env
   PNG_OUTPUT_PATH_LOXX=Z:\LOXX_PNG_OUTPUT
   ENABLE_PNG_UPLOADER=true
   ENABLE_PNG_SYNC=false
   ```

## 🔧 Opción B: Copiar PNGs a PC Local

Si prefieres copiar los PNGs a la PC local:

1. **Crear directorio en PC local:**
   ```
   C:\LOXX\PNG_OUTPUT
   ```

2. **Configurar en `.env`:**
   ```env
   PNG_OUTPUT_PATH_LOXX=C:\LOXX\PNG_OUTPUT
   ENABLE_PNG_UPLOADER=true
   ENABLE_PNG_SYNC=false
   ```

3. **Copiar PNGs periódicamente:**
   - Manualmente, o
   - Usar un script de sincronización de archivos (robocopy, etc.)

## 🚀 Iniciar el Servicio

En PC LOCAL:

```bash
cd backend
npm start
```

Deberías ver:
```
[auto-services] Iniciando monitoreo automático de PNGs...
[auto-services] ✓ Monitoreo PNG iniciado para LOXX
```

Cuando se genere un PNG nuevo en el directorio monitoreado:
```
[png-upload] Procesando nuevo PNG: LOXX_20250718_000000.png
[png-upload] ✓ PNG subido a PostgreSQL: LOXX_20250718_000000.png (ID: 123)
```

## ✅ Ventajas de este Método

- ✅ No requiere servidor HTTP
- ✅ No requiere configuración de firewall
- ✅ Subida directa a PostgreSQL
- ✅ Más rápido (sin descarga HTTP)
- ✅ Funciona con carpetas compartidas o locales

## 🔍 Verificar que Funciona

1. **Genera un PNG nuevo** en la PC remota (o copia uno al directorio monitoreado)
2. **Revisa los logs** del servidor backend
3. **Verifica en PostgreSQL:**
   ```sql
   SELECT * FROM radar_products 
   WHERE radar_id = 'LOXX' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```


