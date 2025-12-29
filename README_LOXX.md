# 🚀 Inicio Rápido - Radar LOXX

Guía rápida para configurar el radar LOXX en 5 minutos.

## 📋 Resumen

- **PC Remota**: Procesa archivos H5 comprimidos → Convierte a PNG → Sirve vía HTTP
- **PC Local**: Descarga PNGs automáticamente → Sube a PostgreSQL

---

## ⚡ Configuración Rápida

### PC Remota (5 pasos):

1. **Copiar archivos:**
   ```
   Copiar desde tesis_utpl/scripts/ a PC remota:
   - process_loxx_h5_compressed.py
   - radar_server_loxx.py
   - convert_h5_to_png.py
   - process_loxx_h5.bat
   - start_loxx_server.bat
   ```

2. **Instalar dependencias:**
   ```bash
   pip install h5py numpy pillow matplotlib
   ```

3. **Procesar archivos:**
   ```bash
   process_loxx_h5.bat
   ```

4. **Iniciar servidor:**
   ```bash
   start_loxx_server.bat
   ```

5. **Verificar:**
   - Abrir: `http://localhost:8080/api/radar/index`

---

### PC Local (2 pasos):

1. **Actualizar `.env`:**
   ```env
   RADAR_LOXX_URL=http://100.100.81.47:8080
   ```

2. **Iniciar servidor:**
   ```bash
   cd tesis_utpl/backend
   npm start
   ```

---

## 📚 Documentación Completa

- **`CONFIGURACION_LOXX.md`** - Guía completa paso a paso
- **`ARCHIVOS_POR_PC_LOXX.md`** - Lista exacta de archivos por PC

---

## ✅ Verificación

### PC Remota:
```bash
python verificar_loxx_setup.py
```

### PC Local:
```bash
curl http://localhost:5000/api/radar/LOXX/pngs
```

---

## 🔧 Solución Rápida de Problemas

**Error: "No module named 'h5py'"**
```bash
pip install h5py numpy pillow matplotlib
```

**Error: "No se puede conectar a PC remota"**
- Verifica que Tailscale esté conectado
- Verifica que el servidor esté corriendo: `http://100.100.81.47:8080/api/radar/index`

**Los PNGs no se descargan**
- Verifica `RADAR_LOXX_URL` en `.env`
- Reinicia el servidor backend

---

## 🎯 Flujo Completo

```
PC Remota:
  F:\LOXX\H5\ (comprimidos)
    → process_loxx_h5_compressed.py
    → F:\LOXX\PNG_OUTPUT\ (PNGs)
    → radar_server_loxx.py (puerto 8080)

PC Local:
  Backend consulta http://100.100.81.47:8080
    → Descarga PNGs
    → Sube a PostgreSQL
    → Visor muestra imágenes
```

---

## 📞 Más Información

Consulta `CONFIGURACION_LOXX.md` para detalles completos.

