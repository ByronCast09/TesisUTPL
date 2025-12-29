@echo off
echo ========================================
echo   DESCARGAR TODOS PNGs A POSTGRESQL
echo ========================================
echo.

cd /d "%~dp0\.."
node scripts/descargar_todos_pngs_postgresql.js %1

pause

