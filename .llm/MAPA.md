# Mapa de `index.html`

~3.700 líneas. **Las líneas se desplazan con cada edición**: úsalas como punto
de partida, pero confirma siempre con `grep -n`.

## Bloques de primer nivel

| Líneas | Contenido |
|---|---|
| 1–20 | `<head>`, CSP, metadatos |
| 22–620 | `<style>` (ver secciones abajo) |
| 621–715 | Marcado: `.app`, `.side`, `.top`, `#main`, `#lock`, `#modalHost` |
| 716–795 | Utilidades: `escapeHtml`, `ICONS`, `svgIcon`, fechas, `uuid` |
| 796–1210 | Clases de dominio y servicios |
| 1204–1315 | `toast`, `Modal`, `confirmDialog`, `promptDialog` |
| 1315–3690 | `class App` |
| 3690–fin | Arranque |

## Secciones del CSS

| Línea | Sección |
|---|---|
| 35 | 1. Tokens y temas (`:root`, `.dark`, `.high`, `.large`) |
| 106 | 2. Base y accesibilidad |
| 149 | 3. Layout (`.app`, `.side`, `.nav`, `.top`, `.content`) |
| 211 | 4. Componentes (`.card`, `.btn`, `.pill`, `.list`, `.table`, `.form`) |
| 403 | 5. Diálogos y toasts |
| 427 | 6. Responsive (860 / 560 / 390 / 1440 px) |
| 498 | 7. Pantalla de bloqueo |
| 529 | 8. Medicamentos |
| 559 | 9. Calendario, resumen diario, paginador |

## Clases y servicios

| Línea | Símbolo |
|---|---|
| 811 | `Vault` |
| 871 | `Profile` |
| 910 | `PinLock` |
| 967 | `Phone` |
| 995 | `StorageManager` |
| 1065–1107 | `Patient`, `Medication`, `Caregiver` |
| 1108 | `MedicationSchedule` |
| 1179 | `Inventory` |
| 1195–1196 | `SymptomTracker`, `HistoryManager` |
| 1219 | `Modal` |

## `class App` · arranque y seguridad

| Línea | Método |
|---|---|
| 1377 | `startFirebase(db)` |
| 1400 | `firebaseUnavailable(error)` |
| 1417 | `firebaseGate(mensaje)` |
| 1467 | `firebaseSync()` |
| 1493 | `migrate()` |
| 1544–1600 | `initLock`, `checkIdle`, `lock`, `renderLockBox` |
| 1796 | `save()` |

## `class App` · interfaz

| Línea | Método | Notas |
|---|---|---|
| 1834 | `buildNav()` | 5 secciones + iconos SVG |
| 1850 | `go(page)` | cambia de vista |
| — | `render()` | reemplaza `#main` |
| 1961 | `dashboardHTML()` | vista **Hoy** |
| 2105 | `medsHTML()` | vista **Tratamiento** |
| 2164 | `inventoryHTML()` | tabla de inventario |
| 2185 | `symptomsHTML()` | vista **Registro** (cabecera) |
| 2196 | `symptomsBodyHTML()` | lista paginada de síntomas |
| 2210 | `rescuesBodyHTML()` | lista paginada de rescates |
| 2239 | `historyHTML()` | buscador + `#historyBody` |
| 2251 | `historyBodyHTML()` | historial filtrado y paginado |
| 2278 | `pagerHTML({…})` | **paginador reutilizable** |
| 2303 | `kindMeta(h)` | evento → icono, color y etiqueta |
| 2316 | `eventsByDay()` | agrupa historial por día |
| 2335 | `calendarInner()` | rejilla del mes |
| 2386 | `daySummaryHTML()` | línea de tiempo del día |
| 2428 | `caregiversHTML()` | vista **Cuidadores** |
| 2462 | `settingsHTML()` | vista **Ajustes** |
| 2655 | `bind()` | buscadores, formularios, interruptores |
| 2704 | `action(e)` | **enrutador de `data-action`** |

## `class App` · acciones y diálogos

| Línea | Método |
|---|---|
| 2744 | `dose(action, id)` — administrar / omitir / posponer / deshacer |
| 2782–2925 | WhatsApp: `waMessage`, `waRecipients`, `groupName`, `whatsappNotice` |
| 2927 | `takeDose(id)` |
| 2969 | `medDialog(m)` |
| 3141 | `symptomDialog()` |
| 3172 | `rescueDialog()` |
| 3201 | `caregiverDialog(c)` |
| 3270 | `pickResponsible(m)` |
| 3334 | `medDetail(id)` |
| 3445 | `exportCSV()` |

## Acciones registradas (`data-action`)

Enrutadas en `action(e)` (línea ~2704):

```
admin · skip · postpone · undo · newMed · editMed · stock · symptom
rescue · newCaregiver · editCaregiver · delCaregiver · takeNow · viewMed
viewMode · exportCSV · goSettings · resetAgenda
calPrev · calNext · calDay
histPrev · histNext · symPrev · symNext · rescPrev · rescNext
```

Añadir una acción = botón con `data-action="x"` + un `case 'x':` en `action()`.
