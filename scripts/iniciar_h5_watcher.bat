@echo off
REM Script para iniciar el servicio automático de monitoreo de archivos H5 (LOXX)
REM Este script debe ejecutarse en la PC REMOTA

echo ========================================
echo Servicio de Monitoreo Automático H5 (LOXX)
echo ========================================
echo.
echo Este servicio monitorea automaticamente el directorio de archivos H5
echo y los procesa cuando detecta nuevos archivos.
echo.
echo Presiona Ctrl+C para detener el servicio
echo ========================================
echo.

REM Configuración
set INPUT_DIR=F:\LOXX\H5
set OUTPUT_DIR=F:\LOXX\PNG_OUTPUT
set RADAR_ID=LOXX

REM Verificar que existe el directorio de entrada
if not exist "%INPUT_DIR%" (
    echo ERROR: El directorio %INPUT_DIR% no existe
    pause
    exit /b 1
)

REM Crear directorio de salida si no existe
if not exist "%OUTPUT_DIR%" (
    echo Creando directorio de salida...
    mkdir "%OUTPUT_DIR%"
)

echo Iniciando servicio de monitoreo...
echo Directorio H5: %INPUT_DIR%
echo Directorio PNG: %OUTPUT_DIR%
echo.

REM Iniciar el servicio Python en modo monitoreo
python process_loxx_h5_compressed.py ^
    --watch ^
    --input-dir "%INPUT_DIR%" ^
    --output-dir "%OUTPUT_DIR%" ^
    --radar-id %RADAR_ID% ^
    --debounce-time 5.0

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo Error al iniciar el servicio
    echo ========================================
    echo.
    echo Verifica que:
    echo - Python este instalado
    echo - watchdog este instalado: pip install watchdog
    echo - process_loxx_h5_compressed.py este en el mismo directorio
    echo ========================================
    pause
)

