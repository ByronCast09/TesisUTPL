# ✅ Verificación del Comando

## Tu Comando (PowerShell)

```powershell
python advanced_ppi_converter.py `
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" `
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" `
    --radar-id LGUAXX `
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

## ✅ Está Correcto

El comando está bien formado. Los backticks (`) en PowerShell permiten continuar líneas.

---

## 🔍 Verificaciones Antes de Ejecutar

### 1. Verificar que el script existe:
```powershell
Test-Path "advanced_ppi_converter.py"
```
Debería devolver `True`

### 2. Verificar que la ruta de datos existe:
```powershell
Test-Path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi"
```
Debería devolver `True`

### 3. Verificar que hay archivos PPI:
```powershell
Get-ChildItem "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" -Filter "*.ppi" -Recurse | Select-Object -First 5
```
Debería mostrar algunos archivos `.ppi`

### 4. Verificar conexión a PostgreSQL:
```powershell
python -c "import psycopg; conn = psycopg.connect('postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata'); print('✓ Conexión exitosa'); conn.close()"
```
Debería mostrar `✓ Conexión exitosa`

---

## 🚀 Ejecutar el Comando

Si todas las verificaciones pasan, ejecuta:

```powershell
python advanced_ppi_converter.py `
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" `
    --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" `
    --radar-id LGUAXX `
    --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

---

## 📋 Alternativa: Todo en una línea

Si prefieres evitar los backticks, puedes escribirlo todo en una línea:

```powershell
python advanced_ppi_converter.py --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi" --output-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" --radar-id LGUAXX --db-url "postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata"
```

---

## ✅ Qué Esperar al Ejecutar

Deberías ver algo como:

```
Iniciando conversión de archivos PPI...
Procesando: 2025-11-28/archivo1.ppi
✓ Convertido: archivo1.ppi -> LGUAXX_20251128_003002.png
↪ Registrado en Postgres LGUAXX_20251128_003002.png
Procesando: 2025-11-28/archivo2.ppi
✓ Convertido: archivo2.ppi -> LGUAXX_20251128_002502.png
↪ Registrado en Postgres LGUAXX_20251128_002502.png
...
Conversión completada. Total: X archivos
```

---

## 🆘 Si Hay Errores

### Error: "No se puede conectar a PostgreSQL"
- Verifica que PostgreSQL está corriendo en `100.124.134.19`
- Verifica que el puerto 5432 está abierto
- Verifica que el password `byronPost` es correcto

### Error: "No se encontraron archivos PPI"
- Verifica que la ruta `D:\Rainview-Analyzer\...\100km.ppi` existe
- Verifica que hay archivos `.ppi` en esa ruta

### Error: "No se pudo importar advanced_ppi_converter"
- Asegúrate de estar en el directorio correcto
- Verifica que `advanced_ppi_converter.py` está en el mismo directorio

---

## 📝 Nota sobre la IP

Veo que estás usando `100.124.134.19` que parece ser una IP de Tailscale/VPN. Asegúrate de que:
- La PC remota puede acceder a esa IP
- PostgreSQL está configurado para aceptar conexiones desde esa red
- El firewall permite conexiones al puerto 5432

---

*Última actualización: Verificación del comando*


