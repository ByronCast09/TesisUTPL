# 🔧 Solución: PNGs sin Datos de Imagen

## 🔍 Problema Detectado

El diagnóstico muestra:
- ✅ 19 fechas disponibles
- ✅ 1000 PNGs registrados
- ❌ **0 PNGs con datos de imagen almacenados**

**Causa**: `STORE_PNG_IN_DB` no estaba activado cuando se sincronizaron los PNGs.

---

## ✅ Solución

### Paso 1: Activar STORE_PNG_IN_DB

Asegúrate de que en `backend/.env` tengas:

```env
STORE_PNG_IN_DB=true
```

### Paso 2: Re-sincronizar PNGs Existentes

Ejecuta el script para descargar y guardar las imágenes de los PNGs existentes:

```bash
cd backend
node scripts/resincronizar_pngs_con_imagenes.js LGUAXX
```

O en Windows:

```bash
cd backend\scripts
resincronizar_pngs.bat LGUAXX
```

Este script:
1. ✅ Encuentra PNGs sin datos de imagen
2. ✅ Descarga las imágenes desde la PC remota
3. ✅ Actualiza PostgreSQL con los datos de imagen

### Paso 3: Verificar

Después de ejecutar el script, verifica:

```bash
cd backend
node scripts/diagnosticar_visor.js
```

Deberías ver:
```
PNGs con datos de imagen: 1000 (o el número que se procesó)
```

---

## 🔄 Sincronización Futura

**Ya está corregido**: El servicio de sincronización ahora:
- ✅ Verifica si un PNG existe pero sin datos de imagen
- ✅ Lo actualiza automáticamente con los datos de imagen
- ✅ Siempre guarda los datos si `STORE_PNG_IN_DB=true`

**Los nuevos PNGs se guardarán correctamente con datos de imagen.**

---

## ⚡ Solución Rápida

```bash
# 1. Verificar que STORE_PNG_IN_DB=true está en .env
# 2. Ejecutar re-sincronización
cd backend
node scripts/resincronizar_pngs_con_imagenes.js LGUAXX

# 3. Verificar resultado
node scripts/diagnosticar_visor.js
```

---

## 📝 Notas

- El script procesa en lotes de 10 para no sobrecargar
- Puede tardar varios minutos dependiendo de cuántos PNGs haya
- Los PNGs se actualizan en PostgreSQL, no se duplican
- Después de esto, el visor debería funcionar correctamente

---

## ✅ Resumen

1. ✅ **Activa** `STORE_PNG_IN_DB=true` en `.env`
2. ✅ **Ejecuta** el script de re-sincronización
3. ✅ **Verifica** que ahora hay PNGs con datos de imagen
4. ✅ **Recarga** el visor

**Después de esto, el visor debería mostrar todas las fechas e imágenes correctamente.**


