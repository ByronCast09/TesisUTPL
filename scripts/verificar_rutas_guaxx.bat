@echo off
REM Script de diagnóstico para verificar rutas de GUAXX antes de ejecutar los servicios

echo ========================================
echo Verificacion de Rutas GUAXX
echo ========================================
echo.

set PPI_DATA_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
set PNG_OUTPUT_PATH=D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\converted_images\LGUAXX

echo Verificando PPI_DATA_PATH: %PPI_DATA_PATH%
echo.

if exist "%PPI_DATA_PATH%" (
    echo [OK] La ruta existe
    echo.
    echo Verificando si es un directorio o archivo...
    
    REM Intentar cambiar al directorio (solo funciona si es directorio)
    pushd "%PPI_DATA_PATH%" >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] No es un directorio accesible
        echo La ruta parece ser un archivo o no tiene permisos
        echo.
        echo El script necesita un DIRECTORIO que contenga archivos .ppi
        echo.
        echo Ejemplos de rutas correctas:
        echo   - D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19\100km.ppi
        echo     (si 100km.ppi es un directorio con subcarpetas YYYY-MM-DD)
        echo   - D:\Rainview-Analyzer\Rainview-Analyzer\rainbow\online\RS19
        echo     (si los archivos .ppi estan directamente aqui)
        echo.
    ) else (
        echo [OK] Es un directorio
        popd
        echo.
        echo Contenido del directorio:
        dir "%PPI_DATA_PATH%" /b
        echo.
        echo Buscando archivos .ppi...
        dir "%PPI_DATA_PATH%\*.ppi" /b /s 2>nul | findstr /i "\.ppi$" >nul
        if errorlevel 1 (
            echo [ADVERTENCIA] No se encontraron archivos .ppi en este directorio
            echo Verifica que la ruta sea correcta
        ) else (
            echo [OK] Se encontraron archivos .ppi
            echo Primeros archivos encontrados:
            dir "%PPI_DATA_PATH%\*.ppi" /b /s 2>nul | findstr /i "\.ppi$" | head -n 5
        )
    )
) else (
    echo [ERROR] La ruta no existe
    echo.
    echo Verificando directorio padre...
    for %%F in ("%PPI_DATA_PATH%") do set "PARENT_DIR=%%~dpF"
    if exist "%PARENT_DIR%" (
        echo Directorio padre existe: %PARENT_DIR%
        echo Contenido:
        dir "%PARENT_DIR%" /b
    ) else (
        echo El directorio padre tampoco existe
    )
)

echo.
echo ========================================
echo Verificando PNG_OUTPUT_PATH: %PNG_OUTPUT_PATH%
echo ========================================
echo.

if exist "%PNG_OUTPUT_PATH%" (
    echo [OK] El directorio de salida existe
    echo Contenido:
    dir "%PNG_OUTPUT_PATH%" /b | head -n 10
) else (
    echo [INFO] El directorio de salida no existe (se creara automaticamente)
)

echo.
echo ========================================
echo Verificacion completada
echo ========================================
echo.
pause

