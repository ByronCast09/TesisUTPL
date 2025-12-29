@echo off
echo ========================================
echo    PROBANDO CONEXION CON PC REMOTA
echo ========================================
echo.

echo Probando conexión con PC remota...
echo IP: 100.88.71.120:8080
echo.

REM Probar conexión con curl
echo Probando con curl...
curl -s http://100.88.71.120:8080/api/radar/index
if errorlevel 1 (
    echo ERROR: No se pudo conectar con la PC remota
    echo.
    echo Posibles soluciones:
    echo   1. Verificar que la PC remota esté ejecutando el servidor
    echo   2. Verificar que Tailscale esté funcionando
    echo   3. Verificar firewall en ambas PCs
    echo.
    pause
    exit /b 1
)

echo.
echo ✓ Conexión exitosa con PC remota
echo.

REM Probar API local
echo Probando API local...
curl -s http://localhost:5000/api/radar/current
if errorlevel 1 (
    echo ERROR: No se pudo conectar con el backend local
    echo.
    echo Posibles soluciones:
    echo   1. Verificar que el backend esté ejecutándose
    echo   2. Verificar que el puerto 5000 esté libre
    echo.
    pause
    exit /b 1
)

echo.
echo ✓ Conexión exitosa con backend local
echo.

echo ========================================
echo    TODAS LAS CONEXIONES FUNCIONAN
echo ========================================
echo.
echo URLs disponibles:
echo   Frontend: http://localhost:4029
echo   Backend: http://localhost:5000
echo   PC Remota: http://100.88.71.120:8080
echo.
pause

