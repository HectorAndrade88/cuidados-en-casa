# Prompt para configurar la base de datos (Firebase)

> Copia todo el bloque siguiente y pégalo en tu asistente de IA (o entrégalo a
> quien configure el backend). Antes de enviarlo, reemplaza lo que está entre
> `⟨ ⟩`.

---

Actúa como desarrollador backend experto en Firebase. Necesito que configures la
base de datos de una aplicación web ya existente. Sigue EXACTAMENTE estas
necesidades; no añadas funciones que no pida ni cambies el modelo de datos.

## Contexto del proyecto
- App: **"cuidados-en-casa"**, para gestión de cuidados domiciliarios de UN paciente.
- Frontend: **HTML/JS estático de un solo archivo (`index.html`)**, alojado en
  **GitHub Pages** (sin servidor propio). El navegador habla directo con Firebase
  mediante el SDK modular v10.
- Uso **privado y familiar**: pocas cuentas de confianza.
- Idioma del código y comentarios: **español**.

## Principio rector (obligatorio)
La información debe ser **única, fija y centralizada para todas las cuentas**.
NADA de configuración por sesión ni por dispositivo: todas las cuentas
autorizadas ven y editan **el mismo y único registro**. No debe existir estado
que dependa del navegador local.

## Arquitectura decidida (Modelo 2: "BD real")
- **Firestore** como base de datos NoSQL de documentos: datos **legibles**
  (no cifrado de extremo a extremo).
- La protección es **login con Google + reglas de seguridad** que solo permiten
  el acceso a una lista blanca de correos.
- **Firebase Storage** para las imágenes; en el documento se guarda solo la
  **URL de descarga**, nunca la imagen en base64 (respetar el límite de 1 MB/doc).
- **Firebase Authentication** con proveedor **Google**.

## Cuentas autorizadas
Solo estos correos Google pueden leer y escribir (mismo listado en Firestore y
Storage):
- ⟨correo1@gmail.com⟩
- ⟨correo2@gmail.com⟩

## Modelo de datos exacto (Firestore)

```
/paciente/perfil                      ← documento único de ID fijo
    { name, age, diagnosis, updatedAt }

/medicamentos/{id}                    ← un documento por medicamento
    {
      id, name, activeIngredient, dose, unit,
      presentation, route, indication, notes,
      color, active, stock, minStock, expiry, lab, nationalCode,
      foto,                            // URL de Storage
      pattern,                         // 'diaria' | 'cada' | 'semana' | 'demanda'
      times,                           // array de "HH:MM"
      everyDays, weekdays,             // weekdays: 0=domingo … 6=sábado
      startDate, endDate, updatedAt
    }

/cuidadores/{id}
    { id, name, role, phone, medIds[], notes, updatedAt }

/sintomas/{id}
    { id, date, ...campos libres del formulario }

/rescates/{id}
    { id, date, medication, amount, reason, result }

/historial/{id}
    { id, date, type, text, ...meta }

/agenda/{YYYY-MM-DD}                   ← un documento por día
    { date, items[] }

/ajustes/app                          ← configuración única de ID fijo
    { dark, large, high, sound, notifications,
      autolock, medView, whatsapp, pin }
```

## Imágenes (Storage)
- Ruta: `medicamentos/{medId}/foto.jpg`.
- Flujo: subir binario → obtener `downloadURL` → guardarlo en el campo `foto`
  del documento `/medicamentos/{medId}`.
- Al borrar un medicamento, borrar también su carpeta en Storage.

## Reglas de seguridad requeridas
1. `firestore.rules`: denegar todo salvo a usuarios autenticados cuyo
   `request.auth.token.email` esté en la lista blanca. Aplicar a `/{document=**}`.
2. `storage.rules`: mismo criterio para `/{allPaths=**}`.
3. Nada debe ser público ni escribible de forma anónima.

## Entregables que espero de ti
1. `firestore.rules` y `storage.rules` completos con la lista blanca ya puesta.
2. Instrucciones paso a paso para: crear el proyecto, habilitar Auth (Google),
   crear Firestore (modo producción), habilitar Storage y publicar las reglas.
3. El objeto `firebaseConfig` de ejemplo y dónde obtener el real.
4. Confirmar que la configuración respeta el principio rector (registro único,
   nada por sesión) y el plan gratuito.

## Restricciones
- Debe funcionar dentro del **plan gratuito** (uso mínimo: un paciente).
- No introducir servidores intermedios ni Cloud Functions salvo que lo pida.
- No romper el `index.html` actual; la integración será un paso posterior.
