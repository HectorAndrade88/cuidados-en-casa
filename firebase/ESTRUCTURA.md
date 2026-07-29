# Estructura de datos en Firebase (Modelo 2 — BD real)

Un **único paciente centralizado**. Datos legibles en Firestore, protegidos por
**login Google + reglas** (solo correos autorizados). Las imágenes van a
**Storage** y en el documento se guarda solo su **URL**.

## Colecciones y documentos (Firestore)

```
/paciente/perfil
    { name, age, diagnosis, updatedAt }

/medicamentos/{id}                 ← un documento por medicamento
    {
      id, name, activeIngredient, dose, unit,          // p. ej. "10", "mg"
      presentation, route, indication, notes,
      color, active, stock, minStock, expiry, lab, nationalCode,
      foto,                                             // URL de Storage (no base64)
      pattern,        // 'diaria' | 'cada' | 'semana' | 'demanda'
      times,          // ["08:00","20:00"]  (array)
      everyDays,      // intervalo para pattern 'cada'
      weekdays,       // [1,3,5]  0=domingo … 6=sábado, para 'semana'
      startDate, endDate,
      updatedAt
    }

/cuidadores/{id}                   ← un documento por cuidador/a
    { id, name, role, phone, medIds[], notes, updatedAt }

/sintomas/{id}
    { id, date, ...campos del formulario }

/rescates/{id}
    { id, date, medication, amount, reason, result }

/historial/{id}
    { id, date, type, text, ...meta }

/agenda/{YYYY-MM-DD}               ← un documento por día
    { date, items: [ ... ] }

/ajustes/app                       ← configuración única y centralizada
    { dark, large, high, sound, notifications,
      autolock, medView, whatsapp, pin }               // pin: huella PBKDF2 opcional
```

## Imágenes (Storage)

```
/medicamentos/{medId}/foto.jpg     ← el binario real
```

Flujo: subir la foto a esa ruta → obtener `downloadURL` → guardarla en el campo
`foto` del documento `/medicamentos/{medId}`. Al borrar un medicamento se borra
también su carpeta de Storage.

## Por qué así

- **Firestore limita 1 MB por documento** → las fotos nunca van dentro; van a Storage.
- **Un documento por entidad** permite buscar, filtrar y ordenar (lo que un
  `perfil.json` cifrado no permitía).
- **`/ajustes/app` y `/paciente/perfil`** son documentos de ID fijo: información
  única y centralizada, nunca por sesión.
