@echo off
title Iniciar Entorno SlabPro
echo ==============================================
echo        INICIANDO ENTORNO LOCAL SLABPRO
echo ==============================================
echo.

:: Iniciar el Servidor (Backend)
echo Iniciando Servidor (Backend) en un proceso paralelo...
start "SlabPro Servidor" cmd /k "cd server && npm run dev"

:: Iniciar el Cliente (Frontend)
echo Iniciando Cliente (Frontend) en un proceso paralelo...
start "SlabPro Cliente" cmd /k "cd client && npm run dev"

echo.
echo ==============================================
echo   Ambos procesos se han iniciado correctamente.
echo   Se abrieron dos nuevas ventanas de consola.
echo   Puedes cerrar esta ventana.
echo ==============================================
timeout /t 5 >nul
