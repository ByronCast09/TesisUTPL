@echo off
REM Script para iniciar el servidor HTTP del radar LOXX en la PC remota

echo ========================================
echo Iniciando servidor LOXX
echo ========================================

REM Configuración
set RADAR_DATA_PATH=F:\LOXX\PNG_OUTPUT
set PORT=8080

REM Verificar que existe el directorio
if not exist "%RADAR_DATA_PATH%" (
    echo ERROR: El directorio %RADAR_DATA_PATH% no existe
    echo Creando directorio...
    mkdir "%RADAR_DATA_PATH%"
)

REM Iniciar servidor
echo Iniciando servidor en puerto %PORT%...
echo Directorio de datos: %RADAR_DATA_PATH%
echo.
python radar_server_loxx.py --data-path "%RADAR_DATA_PATH%" --port %PORT%

pause

