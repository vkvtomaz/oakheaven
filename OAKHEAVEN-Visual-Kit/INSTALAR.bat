@echo off
setlocal
cd /d "%~dp0"
echo Instala o kit NA PASTA PAI da pasta extraida: %~dp0..
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0INSTALAR.ps1" -Projeto "%~dp0.."
echo.
pause
