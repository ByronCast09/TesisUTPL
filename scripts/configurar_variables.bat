@echo off
echo ========================================
echo    CONFIGURANDO VARIABLES DE ENTORNO
echo ========================================
echo.

REM Crear archivo .env en la raíz del proyecto
echo Creando archivo .env en la raíz del proyecto...
(
echo # Configuración del frontend
echo VITE_BACKEND_URL=http://localhost:5000
echo VITE_API_URL=http://localhost:5000/api
echo.
echo # Configuración de GeoServer
echo VITE_GEOSERVER_WORKSPACE=radar
echo.
echo # Configuración del servidor de radar remoto (usar IP de Tailscale)
echo VITE_REMOTE_RADAR_URL=http://100.88.71.120:8080
echo.
echo # Configuración de desarrollo
echo VITE_NODE_ENV=development
) > .env

echo Archivo .env creado ✓

REM Crear archivo .env en backend
echo Creando archivo .env en backend...
(
echo # Configuración del backend
echo PORT=5000
echo NODE_ENV=development
echo.
echo # URLs de los radares remotos (usar IP de Tailscale)
echo RADAR_LGUAXX_URL=http://100.88.71.120:8080/api/radar/index
echo RADAR_LOXX_URL=http://100.88.71.120:8080/api/radar/index
echo.
echo # Configuración de GeoServer (opcional)
echo GEOSERVER_WMS_URL=http://localhost:8080/geoserver/radar/wms
echo GEOSERVER_WORKSPACE=radar
echo.
echo # Deshabilitar Google Cloud
echo USE_GOOGLE_CLOUD=false
echo.
echo # Configuración de Tailscale (para conexión remota)
echo TAILSCALE_API_KEY=tu-tailscale-api-key
echo REMOTE_PC_IP=100.88.71.120
) > backend\.env

echo Archivo backend\.env creado ✓

echo.
echo ========================================
echo    CONFIGURACION COMPLETADA
echo ========================================
echo.
echo Variables configuradas:
echo   Frontend: http://localhost:4029
echo   Backend: http://localhost:5000
echo   PC Remota: http://100.88.71.120:8080
echo.
echo Ahora puedes reiniciar los servicios:
echo   1. Detener backend y frontend
echo   2. Ejecutar: start_local.bat
echo.
pause
