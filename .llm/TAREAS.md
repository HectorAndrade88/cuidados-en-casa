# Recetas para cambios habituales

Cada receta indica **qué buscar** para no leer el archivo entero.

## Añadir un campo a un medicamento

```bash
grep -n "class Medication" index.html      # 1. valor por defecto
grep -n "medDialog" index.html             # 2. campo del formulario + guardado
grep -n "medDetail" index.html             # 3. mostrarlo en la ficha
```
`firebase/db.js` no necesita cambios: guarda el objeto completo.

## Añadir una acción de interfaz

1. Botón: `<button class="btn" type="button" data-action="miAccion" data-id="…">`
2. `grep -n "case 'exportCSV'" index.html` → añade tu `case` al lado.
3. Si va dentro de un modal, asigna el manejador por `id` (la delegación no
   alcanza fuera de `#main`).

## Añadir una sección al menú

```bash
grep -n "buildNav()" index.html
```
- Añade el icono a `ICONS` y la entrada al array `items`.
- Añade la vista al objeto de `render()`.
- Crea `miVistaHTML()`.
- **Ojo**: en móvil el menú es una barra inferior; con 6+ entradas se aprieta.

## Registrar un tipo de evento nuevo

```bash
grep -n "HistoryManager" index.html   # add(state, tipo, texto, meta)
grep -n "kindMeta" index.html         # ← ACTUALÍZALO o caerá en el genérico
```

## Paginar una lista

Ver el patrón completo en `CONVENCIONES.md`. Reutiliza `pagerHTML()`; no
escribas otro paginador.

## Cambiar textos de la interfaz

Están inline en las plantillas. Búscalos por su contenido:

```bash
grep -n "Registros recientes" index.html
```

## Ajustar el aviso de WhatsApp

```bash
grep -n "whatsappNotice\|waMessage\|groupName" index.html
```
Recuerda: un enlace de invitación a grupo **no admite texto prellenado** (es
limitación de WhatsApp). De ahí el flujo *Copiar mensaje → Abrir grupo → Pegar*.
Los envíos individuales sí usan `wa.me` con el texto ya escrito.

## Tocar pautas o agenda

```bash
grep -n "class MedicationSchedule" index.html
```
`appliesOn(m, iso)` decide si un medicamento toca ese día; `today()` construye
la agenda conservando el estado de las dosis ya registradas.

---

# Cómo verificar un cambio

No hay tests. Verifica en el navegador con el servidor estático
(`.claude/launch.json`, perfil `static`, puerto 8765).

La aplicación **exige login de Google**, que un asistente no puede ni debe
hacer. Para inspeccionar la interfaz, inyecta un estado de prueba y desbloquea
la vista **sin persistir nada**:

```js
const app = window.__cuidaApp;
app.save = function(){};          // no escribir en localStorage
app.firebaseSync = function(){};  // no escribir en Firestore
app.state = { /* patient, settings, medications, caregivers, agenda,
                 agendaDate, symptoms, rescues, history */ };
app.locked = false;
document.body.classList.remove('locked');
document.getElementById('lock').hidden = true;
app.buildNav();
app.go('dashboard');
```

Anular `save` y `firebaseSync` es **obligatorio**: sin eso, los datos de prueba
podrían sobrescribir información clínica real.

Un `Medication` de prueba necesita al menos `times: []`, `weekdays: []`,
`pattern` y `active`, o `medsHTML()` lanzará excepción.

## Lista de comprobación antes de cerrar

- [ ] Sin errores en consola.
- [ ] Sin desbordamiento horizontal a 375 px y a 1280 px.
- [ ] Contraste AA en claro, oscuro y alto contraste (con transiciones desactivadas).
- [ ] Objetivos táctiles ≥ 44 px, también en `body.large`.
- [ ] Las cinco vistas siguen renderizando.
