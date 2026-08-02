# Cuida · instrucciones para asistentes

Aplicación de seguimiento domiciliario de medicación. **Toda la app está en
`index.html`** (HTML + CSS + JS en un solo archivo, sin build ni framework).

## Antes de tocar nada

La documentación está en **`.llm/`**. Empieza por [`.llm/README.md`](.llm/README.md)
y abre solo el archivo que necesites:

- `.llm/ARQUITECTURA.md` — módulos, arranque, modos de datos
- `.llm/MAPA.md` — dónde vive cada cosa dentro de `index.html`
- `.llm/DATOS.md` — estado, Firestore, historial
- `.llm/UI.md` — tokens, iconos, responsive, accesibilidad
- `.llm/CONVENCIONES.md` — cómo escribir código aquí
- `.llm/TAREAS.md` — recetas y cómo verificar en el navegador

## Reglas rápidas

1. **No leas `index.html` entero** (~50k tokens). Usa `grep -n` y lee ±40 líneas.
2. **Responde siempre en español.**
3. **CSP estricta**: sin fuentes web, CDN ni dominios externos. No propongas
   Vue, React ni Tailwind: el proyecto es JS puro y así se queda.
4. **Escapa todo dato variable** con `escapeHtml()` al interpolarlo en HTML.
5. **Accesibilidad**: contraste AA en los cuatro temas, objetivos táctiles de
   44 px, `aria-label` en botones de solo icono.
6. **No hagas commit ni push** salvo que se pida explícitamente.
7. Para verificar en el navegador necesitas inyectar estado de prueba: la app
   exige login de Google. **Anula `save` y `firebaseSync` primero** para no
   sobrescribir datos clínicos reales (receta en `.llm/TAREAS.md`).
