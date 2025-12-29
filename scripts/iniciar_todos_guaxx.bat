@echo off
REM Script para iniciar AMBOS servicios de GUAXX en la PC remota
REM Este script inicia el procesador PPI y el servidor HTTP en ventanas separadas

echo ========================================
echo Iniciando Servicios GUAXX Completos
echo ========================================
echo.
echo Este script iniciara:
echo   1. Procesador PPI (monitorea y procesa archivos .ppi)
echo   2. Servidor HTTP (sirve PNGs en puerto 8080)
echo.
echo ========================================
echo.

REM Configuración - AJUSTA ESTAS RUTAS SEGUN TU CONFIGURACION
set RADAR_ID=LGUAXX
REM IMPORTANTE: PPI_DATA_PATH debe ser el DIRECTORIO que contiene los archivos .ppi
REM Si tienes archivos en: D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi\2024-07-18\archivo.ppi
REM Entonces PPI_DATA_PATH debe ser: D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX
set PORT=8080

REM PostgreSQL - AJUSTA ESTOS VALORES SEGUN TU CONFIGURACION
set DB_HOST=100.124.134.19
set DB_PORT=5432
set DB_USER=postgres
set DB_PASSWORD=byronPost
set DB_NAME=radar_metadata

REM Verificar que existe el directorio de entrada
echo Verificando rutas...
echo.

REM Verificar si PPI_DATA_PATH existe y si es directorio o archivo
if exist "%PPI_DATA_PATH%" (
    REM Intentar listar contenido (solo funciona si es directorio)
    dir "%PPI_DATA_PATH%" >nul 2>&1
    if errorlevel 1 (
        echo ADVERTENCIA: %PPI_DATA_PATH% existe pero no es accesible como directorio
        echo Puede ser un archivo. El script necesita un DIRECTORIO.
        echo.
        echo Verificando si es un archivo...
        if exist "%PPI_DATA_PATH%\*" (
            echo OK: Es un directorio: %PPI_DATA_PATH%
        ) else (
            echo ERROR: %PPI_DATA_PATH% parece ser un archivo, no un directorio
            echo.
            echo El script necesita el DIRECTORIO que contiene los archivos .ppi
            echo Por ejemplo, si tus archivos estan en:
            echo   D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi\2024-07-18\archivo.ppi
            echo Entonces PPI_DATA_PATH debe ser:
            echo   D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
            echo.
            echo O si los archivos estan directamente en:
            echo   D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\archivo.ppi
            echo Entonces PPI_DATA_PATH debe ser:
            echo   D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19
            echo.
            pause
            exit /b 1
        )
    ) else (
        echo OK: Directorio PPI encontrado: %PPI_DATA_PATH%
    )
) else (
    echo ERROR: La ruta %PPI_DATA_PATH% no existe
    echo.
    echo Verificando directorio padre...
    for %%F in ("%PPI_DATA_PATH%") do (
        set "PARENT_DIR=%%~dpF"
    )
    if exist "%PARENT_DIR%" (
        echo Directorio padre existe: %PARENT_DIR%
        echo Contenido del directorio padre:
        dir "%PARENT_DIR%" /b
    )
    echo.
    echo Por favor, verifica y corrige la ruta PPI_DATA_PATH en este script
    pause
    exit /b 1
)

REM Crear directorio de salida si no existe
if not exist "%PNG_OUTPUT_PATH%" (
    echo Creando directorio de salida...
    mkdir "%PNG_OUTPUT_PATH%"
    if errorlevel 1 (
        echo ERROR: No se pudo crear el directorio de salida: %PNG_OUTPUT_PATH%
        pause
        exit /b 1
    )
) else (
    echo Directorio de salida encontrado: %PNG_OUTPUT_PATH%
)

REM Obtener el directorio del script
set SCRIPT_DIR=%~dp0

echo Iniciando Servicio 1: Procesador PPI...
echo Directorio de trabajo: %SCRIPT_DIR%
echo Ruta PPI: %PPI_DATA_PATH%
echo Ruta PNG: %PNG_OUTPUT_PATH%
echo.

REM Crear un script temporal para ejecutar el servicio PPI
set TEMP_SCRIPT=%TEMP%\guaxx_ppi_service_%RANDOM%.bat
(
    echo @echo off
    echo cd /d "%SCRIPT_DIR%"
    echo python ppi_auto_converter_service.py --data-path "%PPI_DATA_PATH%" --output-path "%PNG_OUTPUT_PATH%" --radar-id %RADAR_ID% --db-host %DB_HOST% --db-port %DB_PORT% --db-user %DB_USER% --db-password %DB_PASSWORD% --db-name %DB_NAME%
    echo pause
) > "%TEMP_SCRIPT%"

start "GUAXX - Procesador PPI" cmd /k "%TEMP_SCRIPT%"

timeout /t 3 /nobreak >nul

echo Iniciando Servicio 2: Servidor HTTP...

REM Crear un script temporal para ejecutar el servidor HTTP
set TEMP_SCRIPT2=%TEMP%\guaxx_http_server_%RANDOM%.bat
(
    echo @echo off
    echo cd /d "%SCRIPT_DIR%"
    echo python radar_server.py --data-path "%PNG_OUTPUT_PATH%" --port %PORT%
    echo pause
) > "%TEMP_SCRIPT2%"

start "GUAXX - Servidor HTTP" cmd /k "%TEMP_SCRIPT2%"

echo.
echo ========================================
echo Servicios iniciados
echo ========================================
echo.
echo Se abrieron 2 ventanas:
echo   - GUAXX - Procesador PPI: Procesa archivos PPI automaticamente
echo   - GUAXX - Servidor HTTP: Sirve PNGs en http://localhost:8080
echo.
echo IMPORTANTE: Verifica que las rutas esten correctas en este script
echo   PPI Path: %PPI_DATA_PATH%
echo   PNG Path: %PNG_OUTPUT_PATH%
echo.
echo Para detener los servicios, cierra las ventanas o presiona Ctrl+C en cada una
echo ========================================
echo.

pause

