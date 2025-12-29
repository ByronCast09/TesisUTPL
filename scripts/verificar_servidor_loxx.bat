@echo off
REM Script para verificar que el servidor LOXX está configurado correctamente
REM Ejecutar en la PC REMOTA

echo ========================================
echo Verificacion del Servidor LOXX
echo ========================================
echo.

echo 1. Verificando que el servidor esta corriendo...
netstat -an | findstr ":8080"
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Servidor escuchando en puerto 8080
) else (
    echo    [ERROR] Servidor NO esta escuchando en puerto 8080
    echo    Ejecuta: start_loxx_server.bat
)
echo.

echo 2. Verificando reglas de firewall...
netsh advfirewall firewall show rule name="LOXX Server HTTP" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Regla de firewall encontrada
    netsh advfirewall firewall show rule name="LOXX Server HTTP"
) else (
    echo    [ADVERTENCIA] Regla de firewall no encontrada
    echo    Ejecuta: abrir_firewall_loxx.bat (como Administrador)
)
echo.

echo 3. Verificando IP de Tailscale...
ipconfig | findstr "100.100"
if %ERRORLEVEL% EQU 0 (
    echo    [OK] IP de Tailscale encontrada
    ipconfig | findstr /C:"100.100" /C:"IPv4"
) else (
    echo    [ADVERTENCIA] IP de Tailscale no encontrada
    echo    Verifica que Tailscale este conectado
)
echo.

echo 4. Probando servidor localmente...
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:8080/api/radar/index
if %ERRORLEVEL% EQU 0 (
    echo    [OK] Servidor responde localmente
) else (
    echo    [ERROR] Servidor NO responde localmente
    echo    Verifica que start_loxx_server.bat este corriendo
)
echo.

echo ========================================
echo Resumen:
echo ========================================
echo.
echo Para que el servidor sea accesible desde otras PCs:
echo   1. Servidor corriendo (start_loxx_server.bat)
echo   2. Firewall abierto (abrir_firewall_loxx.bat como Admin)
echo   3. Tailscale conectado (IP: 100.100.81.47)
echo.
echo URL para acceder desde otras PCs:
echo   http://100.100.81.47:8080/api/radar/index
echo.
echo ========================================
pause


