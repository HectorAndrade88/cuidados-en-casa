# Sistema visual

## Restricción que condiciona todo: la CSP

```
font-src 'self'      → SIN Google Fonts ni @font-face remoto
style-src 'unsafe-inline'
script-src 'self' 'unsafe-inline' gstatic/apis/google
img-src 'self' data: blob: googleusercontent firebasestorage
connect-src Firebase/Google únicamente
```

No propongas CDN, Tailwind, iconos por paquete ni fuentes web: **la CSP los
bloquea**. Todo debe ser local o inline.

## Tokens (`:root`, línea ~35)

```css
--bg --surface --surface-2 --ink --muted --line
--primary --primary-ink --primary-soft --primary-soft-ink
--good --good-bg    /* administrada */
--warn --warn-bg    /* pendiente   */
--bad  --bad-bg     /* alerta      */
--focus
--radius:14px  --radius-sm:9px  --radius-lg:20px
--shadow-sm  --shadow  --shadow-lg
--font-ui
--fs-base --fs-sm --fs-h1 --fs-h2 --fs-h3
--tap:44px
```

**Usa siempre variables**, nunca colores literales: hay cuatro temas
(`body.dark`, `body.high`, `body.large` y el claro por defecto) y un literal
rompe alguno.

## Tipografía

Stack de sistema (`--font-ui`): `SF Pro Text`, `Segoe UI Variable Text`,
`system-ui`… Escala fluida con `clamp()`. Títulos a peso 800 con `letter-spacing`
negativo. Cifras tabulares en relojes, métricas, horarios, calendario y
paginadores para que los números no se muevan.

## Iconos

Familia única en `ICONS` (línea ~732), trazo 1.9, `viewBox 24`, extremos
redondeados. Se usan con `svgIcon(nombre, tamaño)`.

Disponibles: `clock check alert pill heart rescue send box gear user calendar
left right`.

Para añadir uno, mete solo el contenido interno del `<svg>` en `ICONS` y
respeta el mismo grosor de trazo.

## Componentes propios

| Clase | Uso |
|---|---|
| `.card` | contenedor base |
| `.btn` `.secondary` `.danger` `.wa` `.small` | botones |
| `.pill` `.warn` `.bad` | estados |
| `.list` | listas con separador |
| `.metrics` `.stat-mini` | fila de métricas (contenido centrado) |
| `.dash-grid` `.dash-side` | panel Hoy a dos columnas |
| `.cal` `.cal-panel` `.cal-grid` `.cal-cell` | calendario |
| `.day` `.tl` `.tl-item` `.tl-ic` | resumen diario |
| `.pager` `.pager-info` | paginación |
| `.rec-card` | tarjetas emparejadas con paginador al pie |
| `.wa-group` | aviso al grupo de WhatsApp |
| `.fold` | `<details>` con estilo |

## Puntos de corte

| Ancho | Cambio |
|---|---|
| ≤ 860 px | barra lateral pasa a barra inferior; rejillas a una columna |
| ≤ 560 px | tablas se apilan como tarjetas (`data-label`) |
| ≤ 390 px | densidad reducida para móviles estrechos |
| ≥ 1440 px | contenido más ancho |

## Reglas de maquetación aprendidas

1. **Siempre `minmax(0, …)` en columnas de grid y `min-width:0` en los hijos.**
   Sin esto, `min-width:auto` ensancha la página. Ya provocó un desbordamiento
   real de 476 px en un viewport de 375 px.
2. **Evita `aspect-ratio` en celdas de grid flexible**: crea una dependencia
   circular de tamaño. Usa altura fija.
3. **Textos de longitud imprevisible** → `overflow-wrap:anywhere`.
4. Contenido ancho (tablas, diagramas) → contenedor con `overflow-x:auto`.

## Accesibilidad (no negociable)

- Contraste **AA** (≥ 4.5:1) en los **cuatro** temas. Verifícalo, no lo supongas.
- Objetivo táctil `--tap:44px`; en `body.large` los controles crecen.
- Controles de solo icono → `aria-label`.
- Etiquetas invisibles → `.sr-only` (no quites la etiqueta).
- Cambios dinámicos → `this.announce(mensaje)` (región `aria-live`).
- `:focus-visible` ya está definido globalmente; no lo anules.
- Respeta `prefers-reduced-motion`.

## Cómo verificar sin capturas

Si el panel del navegador no compone imagen, mide con JS:

```js
// ¿Desborda horizontalmente?
document.documentElement.scrollWidth > document.documentElement.clientWidth

// ¿Qué elemento lo causa?
[...document.querySelectorAll('body *')]
  .filter(el => el.getBoundingClientRect().right > innerWidth + 1)
```

Al medir colores **desactiva las transiciones**, o `getComputedStyle` devuelve
el valor intermedio de la animación y el contraste sale falseado:

```js
const s = document.createElement('style');
s.textContent = '*{transition:none !important}';
document.head.appendChild(s);
```
