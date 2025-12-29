@echo off
REM Script para iniciar AMBOS servicios de LOXX en la PC remota
REM Este script inicia el procesador H5 y el servidor HTTP en ventanas separadas

echo ========================================
echo Iniciando Servicios LOXX Completos
echo ========================================
echo.
echo Este script iniciara:
echo   1. Procesador H5 (monitorea y procesa archivos .h5.gz)
echo   2. Servidor HTTP (sirve PNGs en puerto 8080)
echo.
echo ========================================
echo.

REM Configuración
set INPUT_DIR=F:\LOXX\H5
set OUTPUT_DIR=F:\LOXX\PNG_OUTPUT
set RADAR_ID=LOXX
set PORT=8080

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

REM Obtener el directorio del script
set SCRIPT_DIR=%~dp0

echo Iniciando Servicio 1: Procesador H5...
start "LOXX - Procesador H5" cmd /k "cd /d %SCRIPT_DIR% && python process_loxx_h5_compressed.py --watch --input-dir "%INPUT_DIR%" --output-dir "%OUTPUT_DIR%" --radar-id %RADAR_ID%"

timeout /t 3 /nobreak >nul

echo Iniciando Servicio 2: Servidor HTTP...
start "LOXX - Servidor HTTP" cmd /k "cd /d %SCRIPT_DIR% && python radar_server_loxx.py --data-path "%OUTPUT_DIR%" --port %PORT%"

echo.
echo ========================================
echo Servicios iniciados
echo ========================================
echo.
echo Se abrieron 2 ventanas:
echo   - LOXX - Procesador H5: Procesa archivos H5 automaticamente
echo   - LOXX - Servidor HTTP: Sirve PNGs en http://localhost:8080
echo.
echo Para detener los servicios, cierra las ventanas o presiona Ctrl+C en cada una
echo ========================================
echo.

pause


