@echo off
REM Script para abrir el puerto 8080 en el firewall de Windows
REM Debe ejecutarse como Administrador en la PC REMOTA

echo ========================================
echo Abriendo Firewall para Servidor LOXX
echo ========================================
echo.
echo Este script abrira el puerto 8080 en el firewall
echo para permitir conexiones al servidor HTTP LOXX.
echo.
echo ========================================
echo.

REM Verificar si se ejecuta como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador
    echo.
    echo Clic derecho en este archivo y selecciona:
    echo "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo Abriendo puerto 8080 en el firewall...
echo.

REM Agregar regla de firewall para el puerto 8080
netsh advfirewall firewall add rule name="LOXX Server HTTP" dir=in action=allow protocol=TCP localport=8080

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ Puerto 8080 abierto exitosamente
    echo ========================================
    echo.
    echo El servidor HTTP LOXX ahora deberia ser accesible
    echo desde otras PCs en la red (o Tailscale).
    echo.
    echo Verifica que el servidor este corriendo:
    echo   start_loxx_server.bat
    echo.
    echo Prueba desde otra PC:
    echo   http://100.100.81.47:8080/api/radar/index
    echo.
) else (
    echo.
    echo ========================================
    echo ✗ Error al abrir el puerto
    echo ========================================
    echo.
    echo Posibles causas:
    echo - Ya existe una regla con ese nombre
    echo - Permisos insuficientes
    echo.
    echo Intenta abrir manualmente el firewall:
    echo 1. Abre "Firewall de Windows con seguridad avanzada"
    echo 2. Reglas de entrada - Nueva regla
    echo 3. Puerto - TCP - 8080 - Permitir
    echo.
)

echo ========================================
pause


