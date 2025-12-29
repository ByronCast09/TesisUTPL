@echo off
echo ========================================
echo   VERIFICACION DE SINCRONIZACION
echo ========================================
echo.

cd /d %~dp0\..

echo Verificando configuracion de sincronizacion...
echo.

node scripts/verificar_sincronizacion.js

echo.
echo ========================================
echo.
pause

