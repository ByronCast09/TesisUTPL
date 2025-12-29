# 🗺️ Ajuste de Bounds para Radar LOXX

## 📍 Coordenadas del Radar LOXX

Según el script `generar_png_loxx.py`:

- **Latitud**: -3.9960
- **Longitud**: -79.2058
- **Altura**: 2144.0 m
- **Radio de cobertura**: ~120 km (120,000 metros)

## 🧮 Cálculo de Bounds

### Conversión de Radio a Grados:
- 1 grado de latitud ≈ 111 km
- Radio de 120 km ≈ 1.08 grados

### Bounds Calculados:
```
Centro: (-3.9960, -79.2058)
Radio: 1.08 grados

Suroeste (SW):
  lat: -3.9960 - 1.08 = -5.076
  lon: -79.2058 - 1.08 = -80.2858

Noreste (NE):
  lat: -3.9960 + 1.08 = -2.916
  lon: -79.2058 + 1.08 = -78.1258
```

### Formato para Leaflet:
```javascript
const radarBounds = {
  LOXX: [
    [-5.076, -80.2858],   // Suroeste [lat_min, lon_min]
    [-2.916, -78.1258]    // Noreste [lat_max, lon_max]
  ]
};
```

## ✅ Bounds Actualizados en el Visor

Los bounds han sido actualizados en `Visor.jsx` con las coordenadas correctas del radar LOXX.

## 🔍 Verificación

Si el overlay no se muestra correctamente en el mapa, verifica:

1. **Que los bounds estén en el formato correcto:**
   ```javascript
   [[lat_min, lon_min], [lat_max, lon_max]]
   ```

2. **Que el metadata JSON incluya los bounds:**
   El script `generar_png_loxx.py` genera un archivo `metadata.json` con los bounds calculados. Estos deberían estar disponibles en la respuesta de la API.

3. **Verificar en la consola del navegador:**
   ```javascript
   // Ver qué bounds se están usando
   console.log(currentLoxxPng?.bounds);
   ```

## 📝 Notas

- Los bounds se calculan automáticamente en el script Python usando `calculate_bounds_from_metadata()`
- Si el metadata JSON incluye bounds, el visor los usará automáticamente
- Si no hay bounds en el metadata, se usan los bounds por defecto configurados en el visor

## 🗺️ Ubicación en el Mapa

El radar LOXX está ubicado en:
- **Provincia**: Loja, Ecuador
- **Coordenadas**: -3.9960° N, -79.2058° W
- **Cobertura**: ~120 km de radio, cubre gran parte del sur de Ecuador y norte de Perú

