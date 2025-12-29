@echo off
REM Script para procesar archivos H5 comprimidos del radar LOXX (versión avanzada)
REM Usa el mismo enfoque que generar_png_loxx.py
REM Reprocesa automáticamente todas las imágenes existentes con el método corregido

echo ========================================
echo Procesando archivos H5 comprimidos LOXX (Avanzado)
echo ========================================
echo.

REM Configuración
set INPUT_DIR=F:\LOXX\H5
set OUTPUT_DIR=F:\LOXX\PNG_OUTPUT
set RADAR_ID=LOXX
set CLUTTER_DIR=F:\LOXX\Clutter\Reference
set CLUTTER_CACHE=F:\LOXX\clutter_cache_dbzh.pkl

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

echo Procesando archivos desde: %INPUT_DIR%
echo Guardando PNGs en: %OUTPUT_DIR%
echo.
echo NOTA: Si detecta PNGs existentes, los reprocesara automaticamente
echo con el metodo mejorado (data2, combinacion de elevaciones, bounds correctos)
echo.

REM Procesar archivos comprimidos con enfoque avanzado
REM El script Python reprocesara automaticamente los PNGs existentes
python process_loxx_h5_compressed.py ^
    --input-dir "%INPUT_DIR%" ^
    --output-dir "%OUTPUT_DIR%" ^
    --radar-id %RADAR_ID% ^
    --clutter-dir "%CLUTTER_DIR%" ^
    --clutter-cache "%CLUTTER_CACHE%" ^
    --vmin 10.0 ^
    --vmax 70.0 ^
    --transparent-below 8.0 ^
    --cmap meteorological ^
    --recursive

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Procesamiento completado exitosamente
    echo ========================================
    echo.
    echo Todos los PNGs han sido procesados/actualizados con el metodo mejorado:
    echo - Uso de data2 (DBZH) en lugar de data1
    echo - Combinacion de multiples elevaciones
    echo - Bounds correctos para Leaflet
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Error durante el procesamiento
    echo ========================================
)

pause

