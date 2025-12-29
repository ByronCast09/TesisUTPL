# 🔧 Corrección del Procesamiento de LOXX en PC Remota

## 🐛 Problema Identificado

El script `process_loxx_h5_compressed.py` es básico y no usa el mismo enfoque avanzado que `generar_png_loxx.py`, lo que causa que se genere una "línea" en lugar de la imagen completa del radar.

---

## ✅ Solución: Script Avanzado

He creado `process_loxx_h5_compressed_advanced.py` que:

1. **Usa el mismo enfoque que `generar_png_loxx.py`**
2. **Procesa datos DBZH correctamente**
3. **Aplica transformación cartesiana optimizada**
4. **Incluye corrección de clutter** (si hay mapas disponibles)
5. **Genera bounds correctos para Leaflet**

---

## 📁 Archivos para PC Remota

Copia estos archivos a la **PC REMOTA**:

```
PC_REMOTA/
└── scripts/
    ├── process_loxx_h5_compressed_advanced.py    ⭐ NUEVO - Script avanzado
    ├── process_loxx_h5_advanced.bat               ⭐ NUEVO - Script batch avanzado
    ├── loxx_dbzh_georeferenciado.py               📋 YA EXISTE - Funciones avanzadas
    └── convert_h5_to_png.py                       📋 YA EXISTE - Funciones básicas (fallback)
```

---

## 🚀 Uso del Script Avanzado

### Opción 1: Usar el Script Batch

```bash
process_loxx_h5_advanced.bat
```

### Opción 2: Usar Python Directamente

```bash
python process_loxx_h5_compressed_advanced.py ^
    --input-dir "F:\LOXX\H5" ^
    --output-dir "F:\LOXX\PNG_OUTPUT" ^
    --radar-id LOXX ^
    --clutter-dir "F:\LOXX\Clutter\Reference" ^
    --clutter-cache "F:\LOXX\clutter_cache_dbzh.pkl" ^
    --vmin 10.0 ^
    --vmax 70.0 ^
    --transparent-below 8.0 ^
    --recursive
```

---

## 🔍 Diferencias con el Script Básico

### Script Básico (`process_loxx_h5_compressed.py`):
- ❌ No procesa DBZH específicamente
- ❌ No usa transformación cartesiana optimizada
- ❌ No aplica corrección de clutter
- ❌ No combina múltiples elevaciones

### Script Avanzado (`process_loxx_h5_compressed_advanced.py`):
- ✅ Procesa datos DBZH de múltiples elevaciones
- ✅ Usa transformación cartesiana optimizada
- ✅ Aplica corrección de clutter (si hay mapas)
- ✅ Combina elevaciones (toma máximo)
- ✅ Genera bounds correctos para Leaflet
- ✅ Usa el mismo enfoque que `generar_png_loxx.py`

---

## ⚙️ Configuración

### Si tienes `loxx_dbzh_georeferenciado.py`:

El script avanzado lo usará automáticamente y tendrás:
- ✅ Procesamiento DBZH completo
- ✅ Corrección de clutter
- ✅ Transformación cartesiana optimizada
- ✅ Filtros inteligentes

### Si NO tienes `loxx_dbzh_georeferenciado.py`:

El script usará funciones básicas como fallback, pero:
- ⚠️ No tendrá corrección de clutter
- ⚠️ No tendrá transformación cartesiana optimizada
- ⚠️ Puede generar imágenes de menor calidad

---

## 📝 Parámetros Importantes

- `--vmin 10.0`: Umbral mínimo en dBZ (valores menores serán transparentes)
- `--vmax 70.0`: Valor máximo en dBZ
- `--transparent-below 8.0`: Valores menores a 8 dBZ serán transparentes
- `--clutter-dir`: Directorio con archivos de referencia para clutter (opcional)
- `--clutter-cache`: Archivo de cache para mapas de clutter (opcional)

---

## 🔄 Proceso Completo

1. **Procesar archivos H5 comprimidos:**
   ```bash
   process_loxx_h5_advanced.bat
   ```

2. **Verificar que se generaron PNGs:**
   ```bash
   dir F:\LOXX\PNG_OUTPUT\2025-12-06\*.png
   ```

3. **Verificar que los PNGs tienen metadata con bounds:**
   ```bash
   type F:\LOXX\PNG_OUTPUT\2025-12-06\LOXX_20251206_193000.json
   ```

4. **Iniciar servidor:**
   ```bash
   start_loxx_server.bat
   ```

---

## ✅ Verificación

### 1. Verificar que los PNGs se generaron:

```bash
dir F:\LOXX\PNG_OUTPUT\2025-12-06\*.png
```

### 2. Verificar que el metadata incluye bounds:

```bash
type F:\LOXX\PNG_OUTPUT\2025-12-06\LOXX_20251206_193000.json
```

Deberías ver algo como:
```json
{
  "bounds": [[-5.076, -80.2858], [-2.916, -78.1258]],
  "radar_info": {
    "lat": -3.9960,
    "lon": -79.2058
  }
}
```

### 3. Verificar que la imagen se ve correctamente:

Abre uno de los PNGs generados en un visor de imágenes. Deberías ver:
- ✅ Imagen completa del radar (no una línea)
- ✅ Colores según la escala de reflectividad
- ✅ Transparencia en áreas sin datos

---

## 🐛 Solución de Problemas

### Error: "No se encontró archivo .h5"

- Verifica que los archivos comprimidos contengan archivos .h5
- Algunos formatos pueden no ser compatibles

### Error: "loxx_dbzh_georeferenciado.py no encontrado"

- El script funcionará con funciones básicas
- Para mejor calidad, copia `loxx_dbzh_georeferenciado.py` a la PC remota

### La imagen sigue siendo una línea

1. Verifica que estés usando `process_loxx_h5_compressed_advanced.py`
2. Verifica que `loxx_dbzh_georeferenciado.py` esté disponible
3. Verifica que los datos H5 tengan la estructura correcta

---

## 📊 Comparación de Resultados

### Script Básico:
- Genera PNGs pero pueden tener problemas de visualización
- No procesa DBZH específicamente
- Puede generar "líneas" en lugar de imágenes completas

### Script Avanzado:
- Genera PNGs con el mismo enfoque que `generar_png_loxx.py`
- Procesa DBZH correctamente
- Genera imágenes completas del radar
- Incluye bounds correctos para Leaflet

---

## 🎯 Recomendación

**Usa siempre el script avanzado** (`process_loxx_h5_compressed_advanced.py`) para obtener los mejores resultados.

El script básico (`process_loxx_h5_compressed.py`) es solo un fallback si no tienes las funciones avanzadas disponibles.

