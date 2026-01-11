# Actualización de Colores para LOXX

## 📋 Cambios a Realizar

Necesitas actualizar la función `to_rgba` en el archivo `process_loxx_h5_compressed.py` para usar la nueva escala de colores.

## 🎨 Nueva Escala de Colores

Busca esta sección en el archivo (aproximadamente línea 180-210):

```python
# Escala de colores idéntica a GUAXX
dbzh_levels = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 100]

rgba_colors = [
    (0, 0, 0, 0),        # Transparente (0-5 dBZ)
    (0, 255, 0, 100),    # Verde muy ligero (5-10 dBZ)
    ...
]
```

Y **reemplázala** con:

```python
#  Escala meteorológica estándar según intensidad de precipitación
dbzh_levels = [0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80]

# Convertir colores hexadecimales a RGBA
hex_colors = [
    '#FFFFFF00',  # Transparente (sin datos/ruido)
    '#00FFFFFF',  # Celeste claro (0-8 dBZ) - Precipitación muy ligera
    '#0080FF',    # Celeste/Azul claro (8-16 dBZ) - Precipitación ligera
    '#0000FF',    # Azul (16-24 dBZ) - Precipitación moderada baja
    '#0080FF',    # Azul a verde (24-32 dBZ) - Precipitación moderada
    '#00FF00',    # Verde (32-40 dBZ) - Precipitación moderada-fuerte
    '#80FF00',    # Verde a amarillo (40-48 dBZ) - Precipitación fuerte
    '#FFFF00',    # Amarillo a naranja (48-56 dBZ) - Precipitación muy fuerte
    '#FF8000',    # Naranja a rojo (56-64 dBZ) - Precipitación intensa
    '#FF0000',    # Rojo a magenta (64-72 dBZ) - Precipitación muy intensa
    '#FF00FF'     # Magenta brillante (>72 dBZ) - Precipitación extrema/granizo
]

# Convertir hex a RGBA (R, G, B, A) en rango 0-255
def hex_to_rgba(hex_color):
    """Convierte color hexadecimal #RRGGBBAA a tupla (R, G, B, A)"""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 8:  # RRGGBBAA
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        a = int(hex_color[6:8], 16)
        return (r, g, b, a)
    elif len(hex_color) == 6:  # RRGGBB
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return (r, g, b, 255)
    return (0, 0, 0, 0)

rgba_colors = [hex_to_rgba(color) for color in hex_colors]
```

## 🔧 Pasos para Actualizar

1. **Ubicar el archivo:**
   - `c:\Users\Usuario iTC\Desktop\TesisUTPL\process_loxx_h5_compressed.py`
   - O busca en `tesis_utpl\backend\scripts\process_loxx_h5_compressed.py`

2. **Buscar la función `to_rgba`:**
   - Usa Ctrl+F y busca: `dbzh_levels = [0, 5, 10, 15`

3. **Reemplazar la sección de colores:**
   - Copia el código de arriba
   - Reemplaza desde `dbzh_levels = [...]` hasta `rgba_colors = [...]`

4. **Actualizar BoundaryNorm:**
   - Busca la línea `norm = BoundaryNorm(dbzh_levels[:-1], 12)`
   - Cámbiala a: `norm = BoundaryNorm(dbzh_levels, len(rgba_colors))`

5. **Actualizar el colormap:**
   - Busca `cmap = ListedColormap(rgba_colors_normalized[:12])`
   - Cámbiala a: `cmap = ListedColormap(rgba_colors_normalized)`

6. **Eliminar lógica de valores >60:**
   - Busca y elimina el bloque:
     ```python
     # Para valores >60 dBZ, usar el último color
     high_values = (data > 60) & ~np.isnan(data)
     if np.any(high_values):
         rgba[high_values] = [200/255.0, 0, 255/255.0, 255/255.0]
     ```

7. **Actualizar umbral de transparencia:**
   - Busca: `(data < 5)`
   - Cámbialo a: `(data < 8)` (para que coincida con el nuevo primer nivel)

## ✅ Verificación

Después de los cambios, la escala debería ser:
- **0-8 dBZ:** Transparente
- **8-16 dBZ:** Celeste claro
- **16-24 dBZ:** Azul
- **24-32 dBZ:** Azul a verde
- **32-40 dBZ:** Verde
- **40-48 dBZ:** Verde a amarillo
- **48-56 dBZ:** Amarillo
- **56-64 dBZ:** Naranja
- **64-72 dBZ:** Rojo
- **>72 dBZ:** Magenta

## 📝 Nota

Los colores ahora son:
- Más celestes/azules para precipitación ligera
- Verde para moderada-fuerte
- Amarillo-naranja para fuerte
- Rojo-magenta para muy intensa/extrema

Esto proporciona mayor contraste visual entre diferentes intensidades.
