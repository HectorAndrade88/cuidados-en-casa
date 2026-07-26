@echo off
setlocal

REM ============================================================
REM  Cuida - publicacion en GitHub Pages (Windows)
REM
REM  1. Cambia las dos lineas de abajo por tus datos.
REM  2. Crea el repositorio VACIO en github.com/new
REM     (sin README, sin .gitignore, sin licencia).
REM  3. Guarda este archivo y ejecutalo con doble clic.
REM ============================================================

set USUARIO=TU-USUARIO
set REPO=cuida

REM ------------------------------------------------------------
chcp 65001 >nul
cd /d "%~dp0"

if "%USUARIO%"=="TU-USUARIO" (
  echo.
  echo  Edita este archivo y pon tu usuario de GitHub en la linea USUARIO.
  echo.
  pause
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Git no esta instalado. Descargalo en https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

if not exist index.html (
  echo.
  echo  No encuentro index.html en esta carpeta.
  echo.
  pause
  exit /b 1
)

echo.
echo  Publicando en https://%USUARIO%.github.io/%REPO%/
echo.

if not exist .git (
  git init
  git branch -M main
  git remote add origin https://github.com/%USUARIO%/%REPO%.git
) else (
  git remote set-url origin https://github.com/%USUARIO%/%REPO%.git
)

git add index.html 404.html .nojekyll README.md .gitignore test3.js publicar.bat publicar.sh
git commit -m "Cuida: seguimiento domiciliario"
if errorlevel 1 echo  (sin cambios que confirmar, se continua)

git push -u origin main
if errorlevel 1 (
  echo.
  echo  El envio fallo. Revisa que el repositorio exista y que hayas
  echo  iniciado sesion en GitHub cuando te lo pida el navegador.
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo   Listo. Falta un paso que solo se hace la primera vez:
echo.
echo   1. Abre  https://github.com/%USUARIO%/%REPO%/settings/pages
echo   2. En "Source" elige  Deploy from a branch
echo   3. Rama: main    Carpeta: / (root)    y pulsa Save
echo.
echo   En uno o dos minutos estara en:
echo   https://%USUARIO%.github.io/%REPO%/
echo  ============================================================
echo.
pause
