@echo off
REM Script para probar el procesamiento mejorado de LOXX con un archivo específico

echo ========================================
echo Procesando archivo de prueba LOXX
echo ========================================

REM Configuración
set INPUT_DIR=F:\LOXX\H5
set OUTPUT_DIR=F:\LOXX\PNG_OUTPUT_TEST
set RADAR_ID=LOXX

REM Crear directorio de salida si no existe
if not exist "%OUTPUT_DIR%" (
    echo Creando directorio de salida...
    mkdir "%OUTPUT_DIR%"
)

echo Procesando un archivo de prueba...
echo.

REM Procesar un solo archivo para verificar
python process_loxx_h5_compressed.py ^
    --input-file "%INPUT_DIR%\1003_20250711_160000.h5.gz" ^
    --output-dir "%OUTPUT_DIR%" ^
    --radar-id %RADAR_ID% ^
    --vmin 10.0 ^
    --vmax 70.0 ^
    --transparent-below 8.0

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Procesamiento completado
    echo ========================================
    echo Verifica el PNG generado en: %OUTPUT_DIR%
    echo Abre el PNG y verifica que no sea una línea
) else (
    echo.
    echo ========================================
    echo Error durante el procesamiento
    echo ========================================
)

pause

