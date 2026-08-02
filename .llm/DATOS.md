# Modelo de datos

## `app.state` (en memoria)

```js
{
  patient:     { name, age, diagnosis, registrado },
  settings:    { dark, large, high, sound, notifications, autolock,
                 medView, lastBackup, whatsapp, whatsappGroup, whatsappGroupName },
  medications: [ Medication ],
  caregivers:  [ Caregiver ],
  agenda:      [ AgendaItem ],   // SOLO el día de hoy
  agendaDate:  'YYYY-MM-DD',
  symptoms:    [ … ],            // más reciente primero
  rescues:     [ … ],            // más reciente primero
  history:     [ HistoryItem ],  // más reciente primero
  pin:         { … } | undefined
}
```

## Entidades

```js
Medication {
  id, name, activeIngredient, dose, unit, presentation, route,
  indication, notes, color, active, stock, minStock, expiry, lab,
  nationalCode, foto,                 // URL de Storage, nunca base64
  pattern,    // 'diaria' | 'cada' | 'semana' | 'demanda'
  times,      // ['08:00','20:00']
  everyDays,  // para 'cada'
  weekdays,   // [1,3,5]  0=domingo … 6=sábado, para 'semana'
  startDate, endDate
}

Caregiver { id, name, role, phone, medIds[], notes }

AgendaItem {
  id, medId, time,
  status,      // 'pending' | 'administered' | 'skipped' | 'postponed'
  actual,      // ISO del momento real
  responsible, note
}

HistoryItem { id, date /* ISO */, type, text, ...meta }
```

## `history` es la fuente canónica de eventos

**Todo** queda registrado ahí vía `HistoryManager.add(state, type, text, meta)`.
Tipos existentes:

| `type` | Se genera en |
|---|---|
| `medicación` | administrar, omitir o tomar una dosis |
| `síntomas` | `symptomDialog()` |
| `rescate` | `rescueDialog()` |
| `aviso` | envío de aviso por WhatsApp |
| `inventario` | ajuste de stock |
| `cuidador` | alta, edición o baja |
| `configuración` | cambios relevantes de ajustes |

Por eso el **resumen por día** del calendario se construye solo desde
`history`, sin consultar nada más y sin duplicar eventos. `symptoms` y
`rescues` guardan además el detalle estructurado para sus propias listas.

`kindMeta(h)` traduce un evento a icono, color y etiqueta. Si añades un `type`
nuevo, **actualiza también `kindMeta`** o caerá en el genérico "Configuración".

## Firestore (`firebase/db.js`)

```
/paciente/perfil          documento único
/ajustes/app              documento único
/medicamentos/{id}
/cuidadores/{id}
/sintomas/{id}
/rescates/{id}
/historial/{id}
/agenda/{YYYY-MM-DD}      { date, items: [...] }
```

Imágenes en Storage: `/medicamentos/{medId}/foto.jpg`; en el documento solo la
URL. Firestore limita 1 MB por documento, por eso las fotos nunca van dentro.

### Trampa conocida

`loadState()` carga el historial completo pero **solo la agenda de hoy**. Para
reconstruir días pasados usa `history`, nunca `agenda`.

## Fechas

Siempre en **hora local**, nunca `toISOString().slice(0,10)`: en Colombia
(UTC−5) eso devuelve el día siguiente a partir de las 7 p. m.

```js
isoDate(d)            // 'YYYY-MM-DD' local
parseISO('2026-08-02')
addDays(iso, n)
daysBetween(a, b)
prettyDate(iso)       // 'domingo, 2 de agosto'
```

Para agrupar un evento por día: `isoDate(new Date(evento.date))`.

## Guardado

`app.save()` respeta el modo activo. En Firebase agrupa las escrituras con
800 ms de espera (`firebaseSync`). Tras mutar el estado, llama a `save()` y
luego a `render()` o al repintado parcial correspondiente.
