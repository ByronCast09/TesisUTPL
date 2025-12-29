@echo off
echo ========================================
echo   RE-SINCRONIZACION DE PNGs
echo ========================================
echo.

cd /d %~dp0\..

if "%1"=="" (
    echo Uso: resincronizar_pngs.bat [radar] [limite]
    echo.
    echo Ejemplos:
    echo   resincronizar_pngs.bat LGUAXX
    echo   resincronizar_pngs.bat LGUAXX 100
    echo.
    pause
    exit /b 1
)

set RADAR=%1
set LIMITE=%2

echo Radar: %RADAR%
if not "%LIMITE%"=="" echo Limite: %LIMITE%
echo.

echo IMPORTANTE: Asegurate de que STORE_PNG_IN_DB=true este en .env
echo.
pause

node scripts/resincronizar_pngs_con_imagenes.js %RADAR% %LIMITE%

echo.
pause


