# Arquitectura

## Qué es

Aplicación web de **seguimiento domiciliario de medicación** para una sola
paciente, usada por su equipo de cuidadores. Se publica en GitHub Pages.

## Forma del proyecto

```
index.html      ← TODA la aplicación (HTML + CSS + JS, sin build)
firebase/
  db.js               capa de acceso a Firestore/Storage/Auth
  firebase-config.js  claves del proyecto (NO versionar secretos reales)
  firestore.rules     reglas de seguridad
  storage.rules
  ESTRUCTURA.md       modelo de datos en la nube
perfil.json     respaldo cifrado (modo heredado)
test3.js        pruebas sueltas, no forma parte de la app
```

Sin `package.json`, sin dependencias, sin transpilación. El navegador ejecuta
el archivo tal cual. Los módulos de Firebase se cargan por `import()` dinámico
desde `gstatic.com`.

## Arranque

Al final de `index.html`:

```js
import('./firebase/db.js')
  .then(async ({ CuidaDB }) => { await CuidaDB.init(); app.startFirebase(CuidaDB); })
  .catch(err => app.firebaseUnavailable(err));
```

- **Éxito** → `startFirebase()`: exige login de Google (`firebaseGate()`), carga
  el estado con `CuidaDB.loadState()` y renderiza.
- **Fallo** → `firebaseUnavailable()`: pantalla de error bloqueada. **No** abre
  datos locales: es una decisión de seguridad deliberada, no la reviertas.

## Modos de datos (`app.mode`)

| Modo | Significado |
|---|---|
| `firebase` | Único modo activo. Datos centralizados en Firestore. |
| `perfil` | Heredado: `perfil.json` cifrado con AES-GCM. Código aún presente. |
| `local` | Heredado: `localStorage`. Código aún presente. |

El código de `Vault`, `Profile` y `StorageManager` sigue en el archivo por
compatibilidad con respaldos antiguos. No lo borres sin pedirlo.

## Clases principales (orden de aparición)

| Clase | Responsabilidad |
|---|---|
| `B64` | Base64 ↔ bytes |
| `Vault` | Cifrado AES-GCM + PBKDF2 (respaldos) |
| `Profile` | Carga/publicación de `perfil.json` |
| `PinLock` | PIN, intentos fallidos y espera progresiva |
| `Phone` | Validación y formato de móviles + enlaces `wa.me` |
| `StorageManager` | `localStorage`, copias previas e instantáneas |
| `Patient` `Medication` `Caregiver` | Modelos con valores por defecto |
| `MedicationSchedule` | Pautas: `diaria`, `cada`, `semana`, `demanda`; genera la agenda |
| `Inventory` | Nivel de stock y duración estimada |
| `SymptomTracker` `HistoryManager` | Añaden registros al estado |
| `NotificationManager` | Avisos del navegador |
| `Modal` | Diálogos accesibles (foco atrapado, `Esc`, `[data-close]`) |
| `App` | Estado, render, enrutado de acciones y toda la interfaz |

## Ciclo de render

```
app.go(page) → render() → applySettings()
                        → main.innerHTML = vistaHTML()
                        → markActive() → bind()
```

- Cada vista es un método que **devuelve una cadena** (`dashboardHTML()`,
  `treatmentHTML()`, `recordHTML()`, `caregiversHTML()`, `settingsHTML()`).
- No hay DOM virtual: se reemplaza `innerHTML` completo.
- Los eventos van por **delegación** en `#main` (`main.onclick = e => this.action(e)`).

### Consecuencia importante

Un `data-action` **fuera de `#main` no se dispara** (por ejemplo, dentro de un
modal). En modales, asigna el manejador por `id` explícitamente.

## Repintados parciales

Para no perder foco ni posición se repintan bloques concretos en vez de la
vista entera:

| Método | Repinta |
|---|---|
| `renderCalendar()` | `#calWrap` |
| `renderHistory()` | `#historyBody` |
| `symGo(n)` | `#symptomsBody` |
| `rescGo(n)` | `#rescuesBody` |

Los buscadores viven **fuera** del bloque repintado para conservar el foco.

## Persistencia

`app.save()` → según el modo, escribe en `localStorage` o llama a
`firebaseSync()`, que agrupa las ráfagas de cambios con un `setTimeout` de
800 ms antes de escribir en Firestore.
