@echo off
echo ========================================
echo    CONFIGURACION PC REMOTA - RADAR
echo ========================================
echo.

REM Verificar que Python esté instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no está instalado
    echo Por favor instala Python desde https://python.org
    pause
    exit /b 1
)

echo Python encontrado ✓

REM Instalar dependencias de Python
echo Instalando dependencias de Python...
pip install numpy pillow requests

REM Crear directorio de datos si no existe
if not exist "C:\radar_data" mkdir "C:\radar_data"
if not exist "C:\radar_output" mkdir "C:\radar_output"

echo Directorios creados ✓

REM Configurar el servidor de radar
echo Configurando servidor de radar...
python setup_remote_radar.py --data-path "C:\radar_data" --output-path "C:\radar_output" --port 8080

echo.
echo ========================================
echo    CONFIGURACION COMPLETADA
echo ========================================
echo.
echo Para iniciar el servidor de radar:
echo   1. Ejecuta: start_radar_server.bat
echo   2. O manualmente: python radar_server.py --data-path C:\radar_output --port 8080
echo.
echo El servidor estará disponible en: http://localhost:8080
echo Para acceso remoto: http://[IP_DE_ESTA_PC]:8080
echo.
pause
