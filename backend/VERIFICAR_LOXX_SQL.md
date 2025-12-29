# 🔍 Consultas SQL para Verificar LOXX en PostgreSQL

## 📊 Consulta para ID 42670

### Ver todos los datos del registro:

```sql
SELECT 
    id,
    radar_id,
    product_type,
    filename,
    source_timestamp,
    processed_at,
    file_size,
    status,
    checksum,
    -- Ver si tiene imagen (png_data no es null)
    CASE 
        WHEN png_data IS NOT NULL THEN 'Sí tiene imagen'
        ELSE 'NO tiene imagen'
    END as tiene_imagen,
    -- Tamaño de la imagen en bytes
    CASE 
        WHEN png_data IS NOT NULL THEN length(png_data)
        ELSE 0
    END as tamaño_imagen_bytes,
    -- Metadata (primeros 200 caracteres)
    LEFT(metadata::text, 200) as metadata_preview
FROM radar_products
WHERE id = 42670;
```

### Ver solo información básica:

```sql
SELECT 
    id,
    radar_id,
    filename,
    source_timestamp,
    file_size,
    status,
    CASE 
        WHEN png_data IS NOT NULL THEN '✓'
        ELSE '✗'
    END as tiene_imagen
FROM radar_products
WHERE id = 42670;
```

### Ver la imagen completa (solo metadata, no el binario):

```sql
SELECT 
    id,
    radar_id,
    filename,
    source_timestamp,
    file_size,
    -- Verificar que tiene imagen
    (png_data IS NOT NULL) as tiene_imagen,
    -- Tamaño de la imagen
    length(png_data) as tamaño_imagen_bytes,
    -- Metadata completa
    metadata
FROM radar_products
WHERE id = 42670;
```

---

## 📈 Consultas para Verificar LOXX en General

### Contar total de registros de LOXX:

```sql
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as con_imagen,
    COUNT(CASE WHEN png_data IS NULL THEN 1 END) as sin_imagen
FROM radar_products
WHERE radar_id = 'LOXX';
```

### Ver los últimos 10 registros de LOXX:

```sql
SELECT 
    id,
    filename,
    source_timestamp,
    file_size,
    processed_at,
    CASE 
        WHEN png_data IS NOT NULL THEN '✓'
        ELSE '✗'
    END as tiene_imagen,
    status
FROM radar_products
WHERE radar_id = 'LOXX'
ORDER BY source_timestamp DESC
LIMIT 10;
```

### Ver registros de LOXX por fecha:

```sql
SELECT 
    DATE(source_timestamp) as fecha,
    COUNT(*) as total_pngs,
    COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as con_imagen,
    SUM(file_size) as tamaño_total_bytes
FROM radar_products
WHERE radar_id = 'LOXX'
GROUP BY DATE(source_timestamp)
ORDER BY fecha DESC
LIMIT 10;
```

### Verificar que el ID 42670 es de LOXX:

```sql
SELECT 
    id,
    radar_id,
    filename,
    source_timestamp
FROM radar_products
WHERE id = 42670
  AND radar_id = 'LOXX';
```

Si esta consulta devuelve una fila, confirma que el ID 42670 es de LOXX.

---

## 🔍 Consultas de Diagnóstico

### Ver si hay registros sin imagen:

```sql
SELECT 
    id,
    radar_id,
    filename,
    source_timestamp,
    file_size,
    processed_at
FROM radar_products
WHERE radar_id = 'LOXX'
  AND png_data IS NULL
ORDER BY source_timestamp DESC
LIMIT 20;
```

### Ver estadísticas de LOXX:

```sql
SELECT 
    radar_id,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN png_data IS NOT NULL THEN 1 END) as con_imagen,
    COUNT(CASE WHEN png_data IS NULL THEN 1 END) as sin_imagen,
    MIN(source_timestamp) as fecha_mas_antigua,
    MAX(source_timestamp) as fecha_mas_reciente,
    SUM(file_size) as tamaño_total_bytes,
    AVG(file_size) as tamaño_promedio_bytes
FROM radar_products
WHERE radar_id = 'LOXX'
GROUP BY radar_id;
```

### Ver el registro más reciente de LOXX:

```sql
SELECT 
    id,
    filename,
    source_timestamp,
    file_size,
    (png_data IS NOT NULL) as tiene_imagen,
    status
FROM radar_products
WHERE radar_id = 'LOXX'
ORDER BY source_timestamp DESC
LIMIT 1;
```

---

## 🧪 Consulta Rápida para ID 42670

**La consulta más simple para verificar el ID 42670:**

```sql
SELECT 
    id,
    radar_id,
    filename,
    source_timestamp,
    file_size,
    CASE 
        WHEN png_data IS NOT NULL THEN length(png_data) || ' bytes'
        ELSE 'Sin imagen'
    END as imagen,
    status
FROM radar_products
WHERE id = 42670;
```

---

## 📝 Notas

- **`png_data IS NOT NULL`**: Indica que la imagen está guardada en PostgreSQL
- **`file_size`**: Tamaño del archivo PNG original
- **`length(png_data)`**: Tamaño de los datos binarios en PostgreSQL
- **`status = 'ready'`**: El registro está listo para usar

---

## ✅ Qué Buscar

1. **`radar_id = 'LOXX'`**: Confirma que es del radar LOXX
2. **`png_data IS NOT NULL`**: Confirma que la imagen está guardada
3. **`file_size > 0`**: Confirma que tiene un tamaño válido
4. **`source_timestamp`**: Fecha/hora del radar
5. **`status = 'ready'`**: Estado correcto

