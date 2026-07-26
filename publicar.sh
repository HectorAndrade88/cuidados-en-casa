#!/usr/bin/env bash
# ============================================================
#  Cuida · publicación en GitHub Pages (macOS / Linux)
#
#  Uso:  ./publicar.sh TU-USUARIO [nombre-del-repo]
#
#  Antes: crea el repositorio VACÍO en https://github.com/new
#  (sin README, sin .gitignore, sin licencia).
# ============================================================
set -euo pipefail

USUARIO="${1:-}"
REPO="${2:-cuida}"

if [ -z "$USUARIO" ]; then
  echo "Uso: ./publicar.sh TU-USUARIO [nombre-del-repo]"
  exit 1
fi

cd "$(dirname "$0")"

command -v git >/dev/null || { echo "Git no está instalado."; exit 1; }
[ -f index.html ] || { echo "No encuentro index.html en esta carpeta."; exit 1; }

echo
echo "Publicando en https://${USUARIO}.github.io/${REPO}/"
echo

if [ ! -d .git ]; then
  git init
  git branch -M main
  git remote add origin "https://github.com/${USUARIO}/${REPO}.git"
else
  git remote set-url origin "https://github.com/${USUARIO}/${REPO}.git"
fi

git add index.html 404.html .nojekyll README.md .gitignore test3.js publicar.bat publicar.sh
git commit -m "Cuida: seguimiento domiciliario" || echo "(sin cambios que confirmar, se continúa)"
git push -u origin main

cat <<FIN

============================================================
 Listo. Falta un paso que solo se hace la primera vez:

 1. Abre  https://github.com/${USUARIO}/${REPO}/settings/pages
 2. En "Source" elige  Deploy from a branch
 3. Rama: main    Carpeta: / (root)    y pulsa Save

 En uno o dos minutos estará en:
 https://${USUARIO}.github.io/${REPO}/
============================================================

FIN
