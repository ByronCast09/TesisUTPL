@echo off
echo ========================================
echo   VERIFICACION DE CONFIGURACION PNG
echo ========================================
echo.

cd /d %~dp0\..

echo Verificando configuracion...
echo.

node scripts/verificar_automatizacion.js

echo.
echo ========================================
echo.
pause

