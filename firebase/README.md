# Firebase · estructura y despliegue

Archivos de esta carpeta:

| Archivo | Qué es |
|---|---|
| `ESTRUCTURA.md` | Modelo de datos (colecciones, documentos, campos) |
| `firestore.rules` | Reglas de acceso a la base de datos |
| `storage.rules` | Reglas de acceso a las imágenes |
| `firebase-config.example.js` | Plantilla de configuración (renómbrala a `firebase-config.js`) |

## Pasos que debes hacer TÚ en la consola (no puedo hacerlos por ti)

1. **console.firebase.google.com** → *Agregar proyecto* → nombre `cuidados-en-casa`.
2. Icono **web `</>`** → registra la app → copia el `firebaseConfig`.
3. **Authentication** → *Comenzar* → habilita **Google**.
4. **Firestore Database** → *Crear base de datos* → modo producción → región.
5. **Storage** → *Comenzar* (aquí puede pedir activar **Blaze**; gratis a tu volumen).
6. **Authentication → Settings → Authorized domains** → añade tu dominio de GitHub Pages.

## ProtecciÃ³n de App Check (requerida para bloquear clientes no autorizados)

El cÃ³digo ya inicializa **Firebase App Check con reCAPTCHA Enterprise** antes de
conectar Firestore y Storage. Para activarlo de verdad:

1. En **Firebase Console â†’ App Check**, registra la app web y elige **reCAPTCHA Enterprise**.
2. Crea o selecciona la clave de sitio para tu dominio de GitHub Pages y copia la clave pÃºblica en
   `appCheckSiteKey` dentro de `firebase/firebase-config.js`.
3. Publica esta versiÃ³n, usa la aplicaciÃ³n normalmente y revisa las mÃ©tricas de App Check.
4. Cuando las solicitudes vÃ¡lidas aparezcan con token, activa *Enforcement* para **Cloud Firestore**
   y **Cloud Storage** desde App Check. Activarlo antes puede impedir el acceso a clientes antiguos.

Para desarrollo local usa un token de depuraciÃ³n de App Check; no aÃ±adas `localhost` a los
dominios autorizados de reCAPTCHA.

## RestricciÃ³n adicional de la API key

La `apiKey` de Firebase es pÃºblica por diseÃ±o: identifica el proyecto, pero no autoriza accesos.
Como defensa complementaria, en **Google Cloud Console â†’ APIs y servicios â†’ Credenciales**, limita
la clave de navegador a los referentes HTTP de tu sitio (por ejemplo,
`https://TU_USUARIO.github.io/*`) y conserva las API de Firebase que ya estÃ©n permitidas. App Check,
Authentication y las reglas son los controles que protegen los datos.

## Aplicar las reglas (dos opciones)

**Opción A — Copiar y pegar (sin instalar nada):**
- Firestore → pestaña **Reglas** → pega el contenido de `firestore.rules` → *Publicar*.
- Storage → pestaña **Reglas** → pega el contenido de `storage.rules` → *Publicar*.

**Opción B — Con Firebase CLI:**
```bash
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage:rules
```

## Antes de publicar las reglas

Edita la lista `autorizado()` en **`firestore.rules` y `storage.rules`** con los
correos Google que podrán entrar. Ahora mismo trae solo `publicidadescarlata@gmail.com`
como ejemplo.
