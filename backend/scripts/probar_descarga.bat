@echo off
echo ========================================
echo   PRUEBA DE DESCARGA DE PNGs
echo ========================================
echo.

cd /d %~dp0\..

if "%1"=="" (
    echo Uso: probar_descarga.bat [radar] [opcion] [parametro]
    echo.
    echo Ejemplos:
    echo   probar_descarga.bat LGUAXX recent
    echo   probar_descarga.bat LGUAXX recent 3
    echo   probar_descarga.bat LGUAXX date 2025-01-24
    echo   probar_descarga.bat LGUAXX all
    echo.
    pause
    exit /b 1
)

set RADAR=%1
set OPCION=%2
set PARAM=%3

if "%OPCION%"=="" set OPCION=recent

echo Radar: %RADAR%
echo Opcion: %OPCION%
if not "%PARAM%"=="" echo Parametro: %PARAM%
echo.

node scripts/probar_descarga_pngs.js %RADAR% %OPCION% %PARAM%

echo.
pause

