# 🔧 Solución: Línea en el Radar LOXX

## ✅ Cambios Realizados

### 1. **Keys Duplicadas Corregidas**
- Ahora se usan keys únicas basadas en ID o combinación de filename + índice
- Filtrado de duplicados en los arrays de imágenes

### 2. **FitBoundsOnOverlay Agregado**
- Agregado `FitBoundsOnOverlay` para LOXX (igual que LGUAXX)
- Esto ayuda a que el mapa se ajuste correctamente a los bounds del radar

### 3. **Mejor Manejo de Bounds**
- Validación de formato de bounds
- Corrección automática si SW > NE
- Logs en consola para debugging

---

## 🔍 Debugging: Verificar Bounds

Abre la consola del navegador (F12) y verifica:

### 1. Ver los bounds que se están usando:

```javascript
// En la consola del navegador
console.log('LOXX Bounds:', currentLoxxPng?.bounds);
```

Deberías ver algo como:
```javascript
[[-5.076, -80.2858], [-2.916, -78.1258]]
```

### 2. Verificar que la imagen se está cargando:

```javascript
console.log('LOXX URL:', currentLoxxPng?.url);
console.log('LOXX Filename:', currentLoxxPng?.filename);
```

### 3. Verificar el metadata de la imagen:

En la consola deberías ver logs como:
```
LOXX: Usando bounds del metadata: [[...], [...]]
LOXX: Bounds finales para ImageOverlay: [[...], [...]]
```

---

## 🐛 Posibles Causas de la "Línea"

### Causa 1: Bounds Incorrectos

Si los bounds están mal, la imagen se estira incorrectamente y puede verse como una línea.

**Solución:**
1. Verifica los bounds en la consola
2. Los bounds deben ser: `[[lat_min, lon_min], [lat_max, lon_max]]`
3. Asegúrate de que `lat_min < lat_max` y `lon_min < lon_max`

### Causa 2: Metadata sin Bounds

Si el metadata JSON no incluye bounds, se usan los defaults.

**Solución:**
Verifica que el metadata incluya bounds:
```json
{
  "bounds": [[-5.076, -80.2858], [-2.916, -78.1258]]
}
```

### Causa 3: Formato de Bounds Incorrecto

El visor espera bounds en formato `[[SW], [NE]]`.

**Solución:**
El código ahora valida y corrige automáticamente el formato.

### Causa 4: Imagen PNG con Problema

La imagen PNG misma podría tener una línea.

**Solución:**
1. Abre la URL de la imagen directamente en el navegador
2. Verifica que la imagen se vea correctamente
3. Si la imagen tiene una línea, el problema está en el procesamiento Python

---

## 🔧 Pasos para Diagnosticar

### Paso 1: Verificar en la Consola

1. Abre la consola del navegador (F12)
2. Activa el toggle de LOXX
3. Selecciona una fecha e imagen
4. Busca los logs que empiezan con "LOXX:"

### Paso 2: Verificar la Imagen Directamente

1. Copia la URL de la imagen desde la consola
2. Ábrela en una nueva pestaña
3. Verifica si la imagen tiene una línea o se ve correctamente

### Paso 3: Verificar Bounds en PostgreSQL

```sql
SELECT 
    id,
    filename,
    metadata->>'bounds' as bounds_from_metadata
FROM radar_products
WHERE radar_id = 'LOXX'
  AND filename LIKE '%20251206%'
LIMIT 5;
```

### Paso 4: Verificar Metadata JSON

Si el script Python genera archivos `metadata.json`, verifica uno:

```json
{
  "bounds": [[-5.076, -80.2858], [-2.916, -78.1258]],
  "center": [-79.2058, -3.9960],
  ...
}
```

---

## 📝 Bounds Correctos para LOXX

Según el script Python:

```javascript
// Centro del radar
lat: -3.9960
lon: -79.2058

// Radio: 120 km = 1.08 grados

// Bounds calculados
LOXX: [
  [-5.076, -80.2858],   // Suroeste
  [-2.916, -78.1258]    // Noreste
]
```

---

## 🎯 Solución Rápida

Si sigues viendo la línea:

1. **Verifica los bounds en la consola:**
   ```javascript
   console.log(currentLoxxPng?.bounds);
   ```

2. **Si los bounds están mal, actualiza manualmente:**
   - Edita `Visor.jsx`
   - Busca `radarBounds.LOXX`
   - Asegúrate de que sean: `[[-5.076, -80.2858], [-2.916, -78.1258]]`

3. **Verifica que el metadata incluya bounds:**
   - El script Python debería generar bounds en el metadata
   - Si no los genera, agrega la función `calculate_bounds_from_metadata()` al script

4. **Revisa la imagen PNG directamente:**
   - Abre la URL de la imagen en el navegador
   - Si la imagen misma tiene una línea, el problema está en el procesamiento Python

---

## 📞 Información Adicional

- **Coordenadas del radar LOXX**: -3.9960, -79.2058
- **Radio de cobertura**: 120 km
- **Formato de bounds esperado**: `[[lat_min, lon_min], [lat_max, lon_max]]`

Si el problema persiste, comparte:
1. Los bounds que ves en la consola
2. Una captura de pantalla de cómo se ve la "línea"
3. La URL de la imagen que está causando el problema

