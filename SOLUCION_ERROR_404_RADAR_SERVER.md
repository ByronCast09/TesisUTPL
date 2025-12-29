# 🔧 Solución: Error 404 en radar_server.py

## ❌ Problema

Estás viendo errores como:
```
[2025-12-01 18:58:11] "GET /2025-11-28/LGUAXX_20251128_003002.png HTTP/1.1" 404
[2025-12-01 18:58:11] code 404, message File not found
```

## 🔍 Causa

El `radar_server.py` básico **NO maneja rutas con fechas** como `/2025-11-28/archivo.png`.

El servidor está recibiendo peticiones para archivos organizados por fecha, pero:
1. Los archivos no están en esa estructura, O
2. Estás usando la versión incorrecta del servidor

---

## ✅ Solución 1: Usar radar_server_updated.py (Recomendado)

El archivo `radar_server_updated.py` **SÍ maneja** archivos organizados por fecha.

### Pasos:

1. **Detener el servidor actual** (Ctrl+C)

2. **Usar la versión actualizada**:
   ```bash
   python radar_server_updated.py \
       --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
       --port 8080
   ```

3. **Verificar estructura de directorios**:
   ```
   converted_images/
   └── LGUAXX/
       ├── 2025-11-28/
       │   ├── LGUAXX_20251128_003002.png
       │   ├── LGUAXX_20251128_002502.png
       │   └── ...
       └── 2025-11-29/
           └── ...
   ```

---

## ✅ Solución 2: Verificar Estructura de Directorios

Si los archivos **NO están organizados por fecha**, tienes dos opciones:

### Opción A: Reorganizar archivos por fecha

```bash
# Crear estructura de carpetas por fecha
# Mover archivos a carpetas correspondientes
```

### Opción B: Usar radar_server.py básico (si archivos están en raíz)

Si tus archivos están así:
```
converted_images/
└── LGUAXX/
    ├── LGUAXX_20251128_003002.png
    ├── LGUAXX_20251128_002502.png
    └── ...
```

Entonces el `radar_server.py` básico debería funcionar, pero las URLs deben ser:
- ❌ `/2025-11-28/LGUAXX_20251128_003002.png` (no funciona)
- ✅ `/api/radar/image/LGUAXX_20251128_003002.png` (funciona)

---

## 🔍 Diagnóstico: Verificar Estructura Actual

Ejecuta esto para ver cómo están organizados tus archivos:

```bash
# En PowerShell o CMD
cd "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX"
dir /s /b *.png | findstr /C:"2025-11-28"
```

O en Python:
```python
from pathlib import Path

data_path = Path("D:/Rainview-Analyzer/Rainview-Analyzer/rainbow/converted_images/LGUAXX")

# Ver estructura
for item in data_path.iterdir():
    if item.is_dir():
        print(f"📁 {item.name}/")
        for file in item.glob("*.png"):
            print(f"   {file.name}")
    else:
        print(f"📄 {item.name}")
```

---

## ✅ Solución 3: Actualizar radar_server.py

Si prefieres usar `radar_server.py` pero con soporte para fechas, puedes agregar este método:

```python
def do_GET(self):
    """Maneja las peticiones GET"""
    parsed_path = urlparse(self.path)
    path = parsed_path.path
    
    # Endpoint para obtener índice de archivos
    if path == '/api/radar/index':
        self.send_radar_index()
    # Endpoint para obtener imagen específica
    elif path.startswith('/api/radar/image/'):
        self.send_radar_image(path)
    # Endpoint para obtener última imagen
    elif path == '/api/radar/latest':
        self.send_latest_image()
    # NUEVO: Servir archivos por fecha (ej: /2025-11-28/archivo.png)
    elif len(path.split('/')) >= 3 and re.match(r'\d{4}-\d{2}-\d{2}', path.split('/')[1]):
        self.send_file_by_date(path)
    elif path == '/api/radar/directory':
        self.send_radar_directory()
    # Servir archivos estáticos
    else:
        super().do_GET()

def send_file_by_date(self, path):
    """Envía un archivo específico por fecha (ej: /2025-11-28/archivo.png)"""
    import re
    try:
        path_parts = path.strip('/').split('/')
        if len(path_parts) < 2:
            self.send_error(400, "Formato de ruta inválido")
            return
            
        date_str = path_parts[0]
        filename = path_parts[1]
        
        # Validar formato de fecha
        if not re.match(r'\d{4}-\d{2}-\d{2}', date_str):
            self.send_error(400, "Formato de fecha inválido")
            return
        
        file_path = self.radar_data_path / date_str / filename
        
        if not file_path.exists():
            self.send_error(404, f"Archivo no encontrado: {file_path}")
            return
        
        # Determinar tipo de contenido
        content_type = 'application/octet-stream'
        if filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            content_type = 'image/gif'
        
        with open(file_path, 'rb') as f:
            content = f.read()
        
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(content)
        
    except Exception as e:
        self.send_error(500, f"Error: {str(e)}")
```

---

## 📋 Checklist de Verificación

- [ ] ¿Qué versión de `radar_server` estás usando?
  - [ ] `radar_server.py` (básico - no soporta fechas)
  - [ ] `radar_server_updated.py` (soporta fechas) ✅

- [ ] ¿Cómo están organizados tus archivos?
  - [ ] En carpetas por fecha: `2025-11-28/archivo.png` ✅
  - [ ] Todos en la raíz: `archivo.png`

- [ ] ¿Qué ruta estás usando para iniciar el servidor?
  - [ ] `--data-path` apunta al directorio correcto
  - [ ] El directorio contiene las carpetas de fecha

---

## 🚀 Solución Rápida (Recomendada)

**Usa `radar_server_updated.py`** que ya tiene todo implementado:

```bash
# Detener servidor actual (Ctrl+C)

# Iniciar versión actualizada
python radar_server_updated.py \
    --data-path "D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX" \
    --port 8080
```

Este servidor:
- ✅ Maneja rutas con fechas: `/2025-11-28/archivo.png`
- ✅ Genera índice dinámicamente
- ✅ Busca archivos en carpetas por fecha
- ✅ Soporta múltiples formatos (PNG, GIF, NC, etc.)

---

## 🔍 Verificar que Funciona

Después de iniciar `radar_server_updated.py`, prueba:

1. **Índice**: `http://localhost:8080/api/radar/index`
   - Debería mostrar las fechas y archivos disponibles

2. **Archivo específico**: `http://localhost:8080/2025-11-28/LGUAXX_20251128_003002.png`
   - Debería mostrar la imagen (no 404)

---

## 📝 Nota sobre Estructura de Directorios

El conversor `advanced_ppi_converter.py` puede generar archivos en dos estructuras:

### Estructura 1: Por fecha (recomendada)
```
output_path/
└── LGUAXX/
    ├── 2025-11-28/
    │   ├── LGUAXX_20251128_003002.png
    │   └── ...
    └── 2025-11-29/
        └── ...
```

### Estructura 2: Todos en raíz
```
output_path/
└── LGUAXX/
    ├── LGUAXX_20251128_003002.png
    ├── LGUAXX_20251128_002502.png
    └── ...
```

**Para usar `radar_server_updated.py`, necesitas la Estructura 1.**

Si tienes la Estructura 2, puedes reorganizar con un script:

```python
from pathlib import Path
import re
from datetime import datetime

def reorganize_by_date(source_dir):
    """Reorganiza archivos PNG en carpetas por fecha"""
    source = Path(source_dir)
    
    for png_file in source.glob("*.png"):
        # Extraer fecha del nombre del archivo
        # Formato: LGUAXX_20251128_003002.png
        match = re.search(r'(\d{8})', png_file.name)
        if match:
            date_str = match.group(1)
            # Convertir YYYYMMDD a YYYY-MM-DD
            date_formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
            
            # Crear carpeta de fecha
            date_dir = source / date_formatted
            date_dir.mkdir(exist_ok=True)
            
            # Mover archivo
            target = date_dir / png_file.name
            png_file.rename(target)
            print(f"✓ Movido: {png_file.name} → {date_formatted}/")

# Uso
reorganize_by_date("D:/Rainview-Analyzer/.../converted_images/LGUAXX")
```

---

*Última actualización: Solución para error 404 en radar_server*


