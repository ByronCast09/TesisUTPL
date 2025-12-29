@echo off
echo ========================================
echo    CONVERSION DE DATOS DE RADAR
echo ========================================
echo.

REM Verificar directorios
if not exist "C:\radar_data" (
    echo ERROR: Directorio C:\radar_data no existe
    echo Coloca tus archivos .ppi en C:\radar_data
    pause
    exit /b 1
)

if not exist "C:\radar_output" mkdir "C:\radar_output"

echo Convirtiendo datos PPI a PNG...
python advanced_ppi_converter.py --data-path "C:\radar_data" --output-path "C:\radar_output" --radar-id "LGUAXX"

echo.
echo Conversion completada ✓
echo Archivos PNG guardados en: C:\radar_output
echo.

REM Crear archivo de índice
echo Creando índice de archivos...
python generate_index.py --data-path "C:\radar_output"

echo.
echo ========================================
echo    CONVERSION COMPLETADA
echo ========================================
echo.
echo Ahora puedes:
echo   1. Ejecutar: start_radar_server.bat
echo   2. O iniciar el servidor manualmente
echo.
pause

