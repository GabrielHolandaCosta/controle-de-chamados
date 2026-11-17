@echo off
title Controle de Chamados
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo O Node.js nao foi encontrado.
  echo Instale a versao LTS em https://nodejs.org, feche e abra esta janela novamente.
  echo.
  pause
  exit /b 1
)
echo.
echo Iniciando Controle de Chamados...
echo Abra: http://localhost:3000/loginadm
echo Para encerrar, pressione Ctrl+C nesta janela.
echo.
node "%~dp0server.js"
pause
