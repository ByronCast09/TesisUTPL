@echo off
echo ========================================
echo   SINCRONIZAR TODAS LAS FECHAS
echo ========================================
echo.

cd /d "%~dp0\.."
node scripts/sincronizar_todas_fechas.js %1

pause

