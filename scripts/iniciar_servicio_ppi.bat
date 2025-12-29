@echo off
REM Script para iniciar el servicio automático de conversión PPI en la PC REMOTA

echo ========================================
echo   SERVICIO AUTOMATICO PPI - PC REMOTA
echo ========================================
echo.

REM Configuración - AJUSTA ESTAS RUTAS
set RADAR_ID=LGUAXX
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

REM PostgreSQL - AJUSTA ESTOS VALORES
set DB_HOST=100.124.134.19
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=byronPost
set DB_NAME=radar_metadata

REM O usar URL completa:
REM set DATABASE_URL=postgres://postgres:byronPost@100.124.134.19:5432/radar_metadata

echo Configuración:
echo   Radar: %RADAR_ID%
echo   PPI Path: %PPI_DATA_PATH%
echo   PNG Path: %PNG_OUTPUT_PATH%
echo   PostgreSQL: %DB_HOST%:%DB_PORT%/%DB_NAME%
echo.

REM Verificar que Python esté instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado o no está en el PATH
    pause
    exit /b 1
)

REM Verificar que el script existe
if not exist "ppi_auto_converter_service.py" (
    echo ERROR: ppi_auto_converter_service.py no encontrado
    echo Asegúrate de estar en el directorio correcto
    pause
    exit /b 1
)

echo Iniciando servicio...
echo.
echo Presiona Ctrl+C para detener
echo.

REM Ejecutar el servicio
python ppi_auto_converter_service.py ^
    --data-path "%PPI_DATA_PATH%" ^
    --output-path "%PNG_OUTPUT_PATH%" ^
    --radar-id %RADAR_ID% ^
    --db-host %DB_HOST% ^
    --db-port %DB_PORT% ^
    --db-user %DB_USER% ^
    --db-password %DB_PASSWORD% ^
    --db-name %DB_NAME%

pause

