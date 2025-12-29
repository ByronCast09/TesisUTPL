@echo off
echo ========================================
echo   CORREGIR PUBLIC_URLs INCORRECTAS
echo ========================================
echo.

cd /d "%~dp0\.."
node scripts/corregir_public_urls.js %1

pause

