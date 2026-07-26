# Cuida · Seguimiento domiciliario

Aplicación de una sola página para el seguimiento de medicación, síntomas y cuidadores
en cuidados paliativos domiciliarios. Sin servidor, sin base de datos externa y sin
dependencias: todo cabe en un archivo `index.html` que se publica como sitio estático.

---

## Qué hace

| Sección | Contenido |
|---|---|
| **Hoy** | Portada con la foto del próximo medicamento, progreso del día, alertas de inventario y equipo de cuidado |
| **Tratamiento** | Medicamentos en tabla o en galería de fotos, ficha detallada e inventario |
| **Registro** | Síntomas, dosis de rescate e historial exportable a CSV |
| **Cuidadores** | Cada cuidador con varios medicamentos a cargo y su celular de WhatsApp |
| **Ajustes** | Paciente, accesibilidad, seguridad y respaldo |

---

## Aviso por WhatsApp

Cada cuidador tiene un campo de **celular**. Al registrar la administración de cualquier
medicamento aparece un aviso con el mensaje ya redactado —paciente, medicamento, dosis, vía,
hora programada, hora real y responsable— y un botón por destinatario. Se ofrece primero a los
cuidadores responsables de ese medicamento y después al resto del equipo; nunca a quien acaba
de administrarlo, que ya lo sabe. El mensaje es editable antes de enviarlo y queda constancia
en el historial de a quién se avisó.

El envío usa el enlace oficial de «clic para chatear» de WhatsApp (`https://wa.me/NUMERO?text=…`):
**no hay API, ni token, ni credenciales, ni servidor intermediario**. El enlace abre WhatsApp
con el texto escrito y el envío lo confirma la persona. Nada se manda de forma automática.

Los números se normalizan al formato internacional que exige el enlace: si escribes los 10
dígitos de un celular colombiano se les antepone el 57, y se admiten también los formatos
`+57 300…`, `0057 300…` o con paréntesis y guiones. Para otro país basta con anteponer su
indicativo. El campo es opcional, pero si se escribe algo inservible el formulario lo rechaza.

La función se puede desactivar en Ajustes → Accesibilidad y avisos.

---

## Seguridad de la información

Es una aplicación de datos de salud, así que conviene ser preciso sobre qué protege
cada mecanismo y qué no.

### Lo que protege

**Bloqueo con PIN.** Se activa en Ajustes → Seguridad. Pide un PIN al abrir la aplicación,
tras un tiempo de inactividad configurable (1, 5, 15 o 30 minutos) o al pulsar «Bloquear».
El PIN **no se guarda**: se guarda su derivación PBKDF2-SHA256 con sal aleatoria y
310 000 iteraciones. La comparación es en tiempo constante y, tras tres intentos fallidos,
cada nuevo fallo impone una espera creciente (5 s, 15 s, 45 s… hasta 5 minutos).
Mientras está bloqueada, la aplicación se retira del documento: no queda nada visible detrás.

**Respaldo cifrado.** El archivo que se descarga va siempre cifrado con **AES-GCM 256**,
con clave derivada de tu contraseña mediante PBKDF2-SHA256 (310 000 iteraciones).
Cada exportación genera sal e IV nuevos. GCM añade autenticación: si alguien altera un
solo byte del archivo, la restauración falla en vez de cargar datos corruptos.

**Aislamiento de red.** Una `Content-Security-Policy` con `connect-src 'none'` impide
cualquier conexión saliente, y `script-src` no admite scripts externos. Aunque se
consiguiera inyectar código, no tendría por dónde sacar la información. No hay CDN,
ni analítica, ni fuentes remotas: el archivo no carga nada de terceros.

**Tratamiento de las fotos.** Solo se aceptan JPG, PNG, WEBP, GIF y BMP de hasta 8 MB.
Los SVG se rechazan porque pueden contener scripts. Cada imagen se redibuja en un canvas
antes de guardarse, lo que **elimina los metadatos EXIF —incluida la ubicación GPS—** y
cualquier carga incrustada en el archivo original. Al mostrarlas se exige el formato
`data:image/…`, de modo que un respaldo manipulado no puede inyectar atributos ni
provocar peticiones a servidores externos.

### Lo que no protege

Los datos guardados en el navegador **no están cifrados**. El PIN impide verlos desde la
aplicación, pero alguien con acceso al equipo y conocimientos técnicos puede leerlos
directamente desde el almacenamiento del navegador. En un equipo compartido, usa además
el bloqueo de sesión del sistema operativo y una cuenta de usuario propia.

La página publicada es pública: cualquiera puede abrir la URL. Lo que no es público son
**tus datos**, que nunca salen de tu dispositivo. Cada navegador y cada dispositivo tiene
su propia copia: no hay sincronización entre ellos. Para pasar la información de un equipo
a otro se usa el respaldo cifrado.

---

## Respaldo

Hay tres niveles, todos dentro del navegador:

1. **Estado actual.**
2. **Copia del estado anterior**, completa y con fotos, que se renueva en cada cambio.
3. **Hasta 5 copias diarias ligeras**, sin fotos, para poder recuperar el historial aunque
   se agote el espacio.

Las tres viven en el mismo navegador: si se borra su almacenamiento, se pierden. Por eso la
aplicación avisa cuando pasan más de 7 días sin descargar un respaldo. **Descarga el
respaldo cifrado con regularidad y guárdalo fuera del equipo.**

Ajustes muestra el espacio ocupado, cuánto corresponde a fotos y la fecha del último
respaldo. El límite práctico del navegador ronda los 5 MB; las fotos se comprimen a
720 px y JPEG de calidad 0.78 (unos 60–90 KB cada una), así que caben del orden de
40–50 medicamentos con foto. Si el espacio se agota, la aplicación sacrifica primero
las copias automáticas y avisa; los datos del paciente son lo último que se toca.

> **Importante:** ni el PIN ni la contraseña del respaldo se pueden recuperar. No hay
> servidor que los restablezca. Anótalos en un lugar seguro.

---

## Requisitos

Web Crypto —la base del PIN y del cifrado— solo funciona en **contexto seguro**: `https://`
o `localhost`. Si abres `index.html` haciendo doble clic (`file://`), la aplicación funciona
pero esas dos funciones aparecen desactivadas con un aviso. GitHub Pages sirve por HTTPS,
así que publicándolo se resuelve.

Para probarlo en local antes de publicar:

```bash
python -m http.server 8000
# y abre http://localhost:8000
```

---

## Publicar en GitHub Pages

### Opción rápida: el script incluido

**Windows:** abre `publicar.bat`, cambia las dos primeras líneas por tu usuario y el nombre
del repositorio, guárdalo y ejecútalo con doble clic.

**macOS o Linux:**

```bash
chmod +x publicar.sh
./publicar.sh TU-USUARIO cuida
```

### Opción manual

1. Crea un repositorio vacío en GitHub (por ejemplo `cuida`), **sin** README ni `.gitignore`.
2. Desde la carpeta que contiene `index.html`:

```bash
git init
git add index.html 404.html .nojekyll README.md
git commit -m "Cuida: seguimiento domiciliario"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/cuida.git
git push -u origin main
```

3. En GitHub: **Settings → Pages**. En *Source* elige **Deploy from a branch**, rama `main`
   y carpeta `/ (root)`. Guarda.
4. Al cabo de uno o dos minutos estará en `https://TU-USUARIO.github.io/cuida/`.

### Actualizaciones posteriores

```bash
git add -A
git commit -m "Descripción del cambio"
git push
```

### Qué se sube y qué no

Se suben `index.html`, `404.html`, `.nojekyll` y este README. **Nunca subas tus archivos de
respaldo**: aunque van cifrados, no tienen por qué estar en un repositorio público. El
`.gitignore` incluido ya excluye `cuida-respaldo-*.json`.

---

## Archivos

```
index.html   Aplicación completa (estilos, lógica y datos de ejemplo)
404.html     Página de error de GitHub Pages
.nojekyll    Desactiva el procesado de Jekyll
.gitignore   Excluye respaldos y archivos temporales
README.md    Este documento
publicar.bat Comandos de publicación para Windows
publicar.sh  Comandos de publicación para macOS y Linux
test3.js     Pruebas automatizadas (Node, sin dependencias)
```

Las pruebas se ejecutan con `node test3.js` desde la carpeta del proyecto y cubren el ciclo
de cifrado y descifrado, la detección de archivos manipulados, el PIN y su retardo por
intentos fallidos, la validación y el saneado de imágenes, el escapado de HTML, la
validación de los respaldos importados y el comportamiento al agotarse el espacio.

---

## Accesibilidad

Navegación completa por teclado con foco atrapado en los diálogos, `aria-live` para anunciar
los cambios de sección, objetivos táctiles de 44 px, temas claro, oscuro y de alto contraste,
opción de fuente y botones grandes, y respeto por `prefers-reduced-motion`.
