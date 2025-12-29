@echo off
echo ========================================
echo   SINCRONIZACION PNGs FALTANTES
echo ========================================
echo.

cd /d %~dp0\..

set RADAR=%1
if "%RADAR%"=="" set RADAR=LGUAXX

echo Radar: %RADAR%
echo.

echo IMPORTANTE: Asegurate de que STORE_PNG_IN_DB=true este en .env
echo.
pause

node scripts/sincronizar_pngs_faltantes.js %RADAR%

echo.
pause


