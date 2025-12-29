@echo off
echo ========================================
echo    INICIANDO SERVIDOR DE RADAR
echo ========================================
echo.

REM Verificar que el directorio de salida existe
if not exist "C:\radar_output" (
    echo ERROR: Directorio C:\radar_output no existe
    echo Ejecuta primero: setup_remote_pc.bat
    pause
    exit /b 1
)

REM Iniciar el servidor de radar
echo Iniciando servidor en puerto 8080...
echo Acceso local: http://localhost:8080
echo Acceso remoto: http://[IP_DE_ESTA_PC]:8080
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

python radar_server.py --data-path "C:\radar_output" --port 8080

pause

