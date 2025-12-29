@echo off
REM Script de diagnóstico para verificar conectividad con servidor LOXX remoto

echo ========================================
echo Diagnostico de Conexion LOXX
echo ========================================
echo.

REM Obtener IP de la PC remota desde .env (si existe)
set REMOTE_IP=100.100.81.47
set PORT=8080

echo Verificando conectividad con servidor LOXX remoto...
echo IP remota: %REMOTE_IP%
echo Puerto: %PORT%
echo.

echo 1. Verificando si el servidor responde localmente (desde PC remota)...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:%PORT%/api/radar/index
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Servidor responde localmente
) else (
    echo    [ERROR] Servidor NO responde localmente
)
echo.

echo 2. Verificando si el servidor responde desde la red...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" --connect-timeout 5 http://%REMOTE_IP%:%PORT%/api/radar/index
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Servidor responde desde la red
) else (
    echo    [ERROR] Servidor NO responde desde la red
    echo    Posibles causas:
    echo    - Firewall bloqueando el puerto %PORT%
    echo    - IP incorrecta
    echo    - Servidor no esta escuchando en todas las interfaces
)
echo.

echo 3. Verificando puerto abierto...
netstat -an | findstr ":%PORT%"
echo.

echo 4. Verificando procesos Python...
tasklist | findstr python
echo.

echo ========================================
echo Instrucciones:
echo ========================================
echo.
echo Si el servidor responde localmente pero NO desde la red:
echo   1. Verifica el firewall de Windows:
echo      - Abre "Firewall de Windows con seguridad avanzada"
echo      - Crea una regla de entrada para el puerto %PORT%
echo      - O ejecuta: netsh advfirewall firewall add rule name="LOXX Server" dir=in action=allow protocol=TCP localport=%PORT%
echo.
echo   2. Verifica la IP de la PC remota:
echo      - Ejecuta: ipconfig
echo      - Busca la IP de Tailscale (si usas Tailscale)
echo      - O la IP local de la red
echo.
echo   3. Verifica que el servidor este escuchando en 0.0.0.0:
echo      - El servidor debe mostrar: "Serving at http://0.0.0.0:%PORT%"
echo      - NO debe mostrar: "Serving at http://127.0.0.1:%PORT%"
echo.
echo ========================================
pause


