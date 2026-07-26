@echo off
setlocal

REM ============================================================
REM  Cuida - publicar el perfil cifrado
REM
REM  Uso: en la aplicacion, Ajustes -> Generar perfil.json.
REM  Cuando se haya descargado, ejecuta este archivo con doble clic.
REM  Mueve perfil.json desde Descargas al repositorio y lo sube.
REM ============================================================

chcp 65001 >nul
cd /d "%~dp0"

set ORIGEN=%USERPROFILE%\Downloads\perfil.json

if not exist "%ORIGEN%" (
  echo.
  echo  No encuentro perfil.json en la carpeta de Descargas.
  echo.
  echo  Genera primero el archivo desde la aplicacion:
  echo    Ajustes  ^>  Perfil compartido  ^>  Generar perfil.json
  echo.
  pause
  exit /b 1
)

echo.
echo  Moviendo perfil.json al repositorio...
move /y "%ORIGEN%" "%~dp0perfil.json" >nul
if errorlevel 1 (
  echo  No se pudo mover el archivo. Cierralo si esta abierto y reintenta.
  pause
  exit /b 1
)

git add perfil.json
git commit -m "Actualizar perfil cifrado"
if errorlevel 1 echo  (sin cambios que confirmar, se continua)

git push
if errorlevel 1 (
  echo.
  echo  El envio fallo. Revisa tu conexion y tu sesion de GitHub.
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo   Perfil publicado. En uno o dos minutos, cualquier dispositivo
echo   que abra el sitio y escriba la clave vera esta informacion.
echo  ============================================================
echo.
pause
