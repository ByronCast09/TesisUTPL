@echo off
echo ========================================
echo   INSTALACION DE DEPENDENCIAS
echo ========================================
echo.

cd /d %~dp0\..

echo Instalando dependencias de Node.js...
call npm install

echo.
echo ========================================
echo   DEPENDENCIAS INSTALADAS
echo ========================================
echo.
echo IMPORTANTE: Asegurate de tener instalado:
echo   - Python 3.x
echo   - psycopg (pip install psycopg[binary])
echo   - numpy, PIL/Pillow (pip install numpy pillow)
echo.
pause

