# 🖥️ INSTRUCCIONES PARA PC LOCAL

## 🎯 **Objetivo**
Configurar la PC local para conectarse a la PC remota y visualizar los datos de radar.

## 📋 **Requisitos**
- Node.js instalado
- Conexión de red a la PC remota
- Conocer la IP de la PC remota

## 🚀 **Pasos de Configuración**

### **1. Obtener IP de la PC Remota**
En la PC remota, ejecuta:
```bash
ipconfig
# Anota la IP (ej: 192.168.1.100)
```

### **2. Configurar Variables de Entorno**
Crear archivo `.env` en la raíz del proyecto:

```env
# Configuración del frontend
VITE_BACKEND_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000/api

# IMPORTANTE: Cambiar por la IP real de tu PC remota
VITE_REMOTE_RADAR_URL=http://192.168.1.100:8080

# Configuración de GeoServer
VITE_GEOSERVER_WORKSPACE=radar
```

### **3. Configurar Backend**
Crear archivo `.env` en `backend/`:

```env
# Configuración del backend
PORT=5000
NODE_ENV=development

# URLs de los radares remotos
RADAR_LGUAXX_URL=http://192.168.1.100:8080/api/radar/index
RADAR_LOXX_URL=http://192.168.1.100:8080/api/radar/index

# Configuración de GeoServer
GEOSERVER_WMS_URL=http://localhost:8080/geoserver/radar/wms
```

### **4. Iniciar Servicios**

#### **Terminal 1 - Backend:**
```bash
cd backend
npm install
npm start
```

#### **Terminal 2 - Frontend:**
```bash
npm install
npm start
```

## 🌐 **URLs de Acceso**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **PC Remota**: http://192.168.1.100:8080

## 🔧 **Verificación de Conexión**

### **1. Verificar PC Remota**
```bash
# Probar conexión a PC remota
curl http://192.168.1.100:8080/api/radar/index
# O en navegador: http://192.168.1.100:8080/api/radar/index
```

### **2. Verificar Backend**
```bash
# Probar API local
curl http://localhost:5000/api/radar/current
# O en navegador: http://localhost:5000/api/radar/current
```

### **3. Verificar Frontend**
- Abrir: http://localhost:3000
- Deberías ver la interfaz del visor de radar
- Los datos deberían cargarse desde la PC remota

## 🔧 **Solución de Problemas**

### **Error: No se pueden obtener datos**
1. Verificar que la PC remota esté ejecutando el servidor
2. Verificar la IP en las variables de entorno
3. Verificar firewall en ambas PCs
4. Probar ping: `ping 192.168.1.100`

### **Error: Puerto en uso**
```bash
# Backend (puerto 5000)
netstat -ano | findstr :5000
taskkill /PID [NUMERO_PID] /F

# Frontend (puerto 3000)
netstat -ano | findstr :3000
taskkill /PID [NUMERO_PID] /F
```

### **Error: CORS**
El backend ya tiene CORS habilitado, pero si hay problemas:
```javascript
// En backend/server.js
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.100:3000']
}));
```

## 📊 **Flujo de Datos**

1. **PC Remota**: Procesa datos .ppi → Convierte a PNG → Sirve en puerto 8080
2. **PC Local Backend**: Consulta PC remota → Procesa datos → Sirve en puerto 5000
3. **PC Local Frontend**: Consulta backend local → Muestra datos en visor

## 🔄 **Automatización**

### **Script de Inicio Rápido**
Crear `start_local.bat`:

```batch
@echo off
echo Iniciando sistema de radar local...

echo Iniciando backend...
start "Backend" cmd /k "cd backend && npm start"

timeout /t 3

echo Iniciando frontend...
start "Frontend" cmd /k "npm start"

echo Sistema iniciado ✓
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
pause
```

## 📝 **Notas Importantes**

- La PC remota debe estar ejecutando el servidor de radar
- Si cambias la IP de la PC remota, actualiza las variables de entorno
- El firewall debe permitir conexiones en los puertos 3000, 5000 y 8080
- Los datos se actualizan automáticamente cada 5 minutos

## 🆘 **Soporte**

Si tienes problemas:
1. Verificar logs del backend: `console.log` en terminal
2. Verificar logs del frontend: F12 → Console
3. Verificar conexión de red: `ping [IP_PC_REMOTA]`
4. Verificar que el servidor remoto esté ejecutándose

