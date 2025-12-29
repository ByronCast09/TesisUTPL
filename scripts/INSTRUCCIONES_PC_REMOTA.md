# 📡 INSTRUCCIONES PARA PC REMOTA

## 🎯 **Objetivo**
Configurar la PC remota para procesar datos de radar y servirlos a la PC local.

## 📋 **Requisitos**
- Python 3.7+ instalado
- Acceso a los datos de radar (archivos .ppi)
- Conexión de red entre PC remota y local

## 🚀 **Pasos de Configuración**

### **1. Preparar el Entorno**
```bash
# Copiar todos los scripts a la PC remota
# Instalar dependencias de Python
pip install numpy pillow requests
```

### **2. Estructura de Directorios**
```
C:\radar_data\          # Aquí van tus archivos .ppi originales
C:\radar_output\        # Aquí se guardan los PNG convertidos
```

### **3. Configuración Automática**
Ejecuta en orden:
1. `setup_remote_pc.bat` - Configuración inicial
2. `convert_radar_data.bat` - Convierte datos PPI a PNG
3. `start_radar_server.bat` - Inicia el servidor

### **4. Configuración Manual**
Si prefieres hacerlo manualmente:

```bash
# 1. Crear directorios
mkdir C:\radar_data
mkdir C:\radar_output

# 2. Copiar archivos .ppi a C:\radar_data

# 3. Convertir datos
python advanced_ppi_converter.py --data-path "C:\radar_data" --output-path "C:\radar_output" --radar-id "LGUAXX"

# 4. Iniciar servidor
python radar_server.py --data-path "C:\radar_output" --port 8080
```

## 🌐 **Configuración de Red**

### **Obtener IP de la PC Remota**
```bash
ipconfig
# Anota la IP (ej: 192.168.1.100)
```

### **Configurar Firewall**
1. Abrir Windows Defender Firewall
2. Permitir Python a través del firewall
3. Permitir puerto 8080

### **Verificar Conexión**
- Local: http://localhost:8080
- Remoto: http://[IP_DE_ESTA_PC]:8080

## 📊 **Endpoints Disponibles**

Una vez iniciado el servidor:

- `http://localhost:8080/api/radar/index` - Lista de archivos
- `http://localhost:8080/api/radar/latest` - Última imagen
- `http://localhost:8080/api/radar/image/[archivo.png]` - Imagen específica

## 🔧 **Solución de Problemas**

### **Error: Puerto en uso**
```bash
netstat -ano | findstr :8080
taskkill /PID [NUMERO_PID] /F
```

### **Error: Python no encontrado**
- Instalar Python desde https://python.org
- Marcar "Add Python to PATH" durante instalación

### **Error: Dependencias faltantes**
```bash
pip install --upgrade pip
pip install numpy pillow requests
```

## 📞 **Verificación**

Para verificar que todo funciona:

1. Abre navegador en: http://localhost:8080/api/radar/index
2. Deberías ver un JSON con la lista de archivos
3. Prueba: http://localhost:8080/api/radar/latest

## 🔄 **Automatización**

Para que el servidor se inicie automáticamente:

1. Crear tarea programada en Windows
2. Acción: Ejecutar `start_radar_server.bat`
3. Configurar para iniciar con Windows

## 📝 **Notas Importantes**

- El servidor debe estar ejecutándose para que la PC local pueda acceder a los datos
- Si cambias la IP de la PC remota, actualiza la configuración en la PC local
- Los archivos .ppi se convierten a PNG automáticamente
- El servidor regenera el índice cada vez que se inicia