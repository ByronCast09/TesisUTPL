@echo off
echo ========================================
echo    INICIANDO SISTEMA DE RADAR LOCAL
echo ========================================
echo.

REM Verificar que Node.js esté instalado
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

echo Node.js encontrado ✓

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ERROR: No se encontró package.json
    echo Asegúrate de estar en el directorio raíz del proyecto
    pause
    exit /b 1
)

echo Directorio del proyecto encontrado ✓

REM Instalar dependencias si es necesario
if not exist "node_modules" (
    echo Instalando dependencias del frontend...
    npm install
)

if not exist "backend\node_modules" (
    echo Instalando dependencias del backend...
    cd backend
    npm install
    cd ..
)

echo Dependencias instaladas ✓

REM Iniciar backend
echo Iniciando backend en puerto 5000...
start "Backend - Radar API" cmd /k "cd backend && npm start"

REM Esperar un momento para que el backend se inicie
echo Esperando que el backend se inicie...
timeout /t 5

REM Iniciar frontend
echo Iniciando frontend en puerto 3000...
start "Frontend - Radar Viewer" cmd /k "npm start"

echo.
echo ========================================
echo    SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo URLs disponibles:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo IMPORTANTE: Asegúrate de que la PC remota esté ejecutando
echo el servidor de radar en el puerto 8080
echo.
echo Para detener el sistema, cierra las ventanas de terminal
echo.
pause

