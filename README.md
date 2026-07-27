# Cuida · Seguimiento domiciliario

Aplicación de una sola página para el seguimiento en casa de la medicación, los síntomas y
el equipo de cuidado de **una persona**. Sin servidor, sin base de datos externa y sin
dependencias: todo cabe en un archivo `index.html` que se publica como sitio estático.

No presupone ninguna enfermedad, especialidad ni edad: sirve igual para un tratamiento
crónico, una convalecencia o el acompañamiento de un mayor en casa.

---

## Un único paciente

Toda la información gira alrededor de una sola persona: los medicamentos, la agenda, los
síntomas, los cuidadores y el historial le pertenecen. Su nombre, edad y motivo de
seguimiento se registran en Ajustes y se ven en la **barra superior de todas las secciones**,
donde además funcionan como acceso directo para editarlos.

La aplicación **arranca vacía**: no inventa pacientes ni tratamientos. El panel de inicio
muestra unos primeros pasos —registrar al paciente, añadir el primer medicamento, añadir
cuidadores— que desaparecen al completarlos. Para explorar la aplicación llena antes de
usarla, en Ajustes hay un botón que carga datos de ejemplo claramente identificados como
tales, y otro que lo vacía todo.

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

## Pautas de administración

No todo tratamiento es diario. Cada medicamento define **cada cuánto** se administra:

| Pauta | Para qué sirve | Ejemplo |
|---|---|---|
| **Todos los días** | Lo habitual | Morfina cada 8 horas |
| **Cada N días** | Intervalos fijos | Cada 3 días, o un día sí y otro no |
| **Días fijos de la semana** | Días concretos | Lunes, miércoles y viernes |
| **Según necesidad** | Sin horario ni fecha | Hioscina para secreciones; también material fungible |

Las pautas por intervalo se cuentan desde la **fecha de inicio**, que marca el punto de
partida del ciclo: si empiezas un cada-3-días el 1 de julio, toca el 1, el 4, el 7… También
puede fijarse un **fin de tratamiento** opcional, tras el cual el medicamento deja de
programarse solo.

### Sin horario de aplicación

La pauta **según necesidad** existe para lo que se controla por existencias y no por reloj:
medicación de rescate, algo que se administra cuando aparece el síntoma, o material fungible
del que solo interesa saber cuánto queda. Al elegirla desaparecen los campos de horario,
inicio y fin: no hay nada que programar.

Estos medicamentos no generan dosis en la agenda ni aparecen como pendientes. Sí aparecen en
Tratamiento, en el inventario y en una tarjeta propia del panel de inicio, con un botón
**Registrar toma** que pide el responsable, descuenta una unidad del inventario, deja
constancia en el historial y ofrece el aviso por WhatsApp, igual que una dosis programada.

Su duración no se calcula: sin consumo previsible, cualquier cifra sería inventada, así que
la columna muestra «sin consumo previsible». La alerta de stock bajo sí funciona con
normalidad.

La agenda pertenece a un día concreto y **se recrea sola al cambiar de fecha**, incluso con
la aplicación abierta. Al editar un medicamento se recalcula conservando las dosis que ya
hubieras registrado ese día. Si hoy no corresponde nada, el panel de inicio dice cuál es la
próxima y cuándo.

El cálculo de duración del inventario tiene en cuenta la pauta: diez comprimidos con una
toma diaria duran diez días, pero con una pauta de cada tres días duran treinta.

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

## Perfil compartido entre dispositivos

La aplicación tiene dos modos.

**Modo local** (por defecto, hasta que publiques un perfil): los datos viven solo en el
navegador donde los cargaste. Se protegen con un PIN opcional y se mueven a mano con el
respaldo cifrado.

**Modo perfil** (al pulsar *Crear perfil cifrado* en Ajustes): los datos se publican como
`perfil.json`, un archivo cifrado con AES-GCM que se sube al repositorio junto al
`index.html`. Cualquier dispositivo que abra la URL descarga ese archivo y **no muestra
absolutamente nada** hasta que se escribe la clave de acceso, porque hasta ese momento no
hay datos descifrados en memoria. El descifrado *es* la puerta: no es un candado dibujado
delante de una información que ya está cargada.

En este modo el navegador tampoco guarda nada legible: la copia local va cifrada con la
misma clave, que existe únicamente en memoria mientras la sesión está abierta. Al bloquear
—manualmente o por inactividad— la clave y los datos descifrados se descartan.

### Publicar cambios

Los cambios se guardan cifrados en tu navegador, pero los demás dispositivos no los ven
hasta que republiques. En Ajustes → *Generar perfil.json* se descarga el archivo; después
hay que reemplazarlo en el repositorio y subirlo. En Windows, `publicar-perfil.bat` hace
las tres cosas: lo mueve desde Descargas, confirma y sube.

Ajustes avisa cuando hay cambios sin publicar, y al entrar te advierte si el perfil del
repositorio es más reciente que lo que tiene este navegador.

### El riesgo que asumes

`perfil.json` es público: cualquiera puede descargarlo. No podrá leerlo sin la clave, pero
**sí puede intentar adivinarla sin conexión**, con todo el tiempo y el hardware que quiera.
Eso es inherente a querer los mismos datos en todos los dispositivos sin servidor. Las
defensas son PBKDF2-SHA256 con 600 000 iteraciones —que encarece muchísimo cada intento— y
un mínimo obligatorio de 12 caracteres. Usa una frase larga, no una palabra. Si la
información es especialmente sensible, valora quedarte en modo local.

---

## Seguridad de la información

Es una aplicación de datos de salud, así que conviene ser preciso sobre qué protege
cada mecanismo y qué no.

### Lo que protege

**La clave de acceso, en modo perfil.** Sin ella no se descifra ni se muestra nada, en
ningún navegador ni dispositivo. Los datos están cifrados con AES-GCM 256 tanto en el
archivo publicado como en la copia local. La clave no se guarda en ninguna parte.

**Bloqueo con PIN, en modo local.** Se activa en Ajustes → Seguridad. Pide un PIN al abrir
la aplicación, tras un tiempo de inactividad configurable (1, 5, 15 o 30 minutos) o al
pulsar «Bloquear». El PIN **no se guarda**: se guarda su derivación PBKDF2-SHA256 con sal
aleatoria y 600 000 iteraciones. La comparación es en tiempo constante y, tras tres intentos
fallidos, cada nuevo fallo impone una espera creciente (5 s, 15 s, 45 s… hasta 5 minutos).

**Respaldo cifrado.** El archivo que se descarga va siempre cifrado con **AES-GCM 256**,
con clave derivada de tu contraseña mediante PBKDF2-SHA256 (600 000 iteraciones).
Cada exportación genera sal e IV nuevos. GCM añade autenticación: si alguien altera un
solo byte del archivo, la restauración falla en vez de cargar datos corruptos.

**Aislamiento de red.** Una `Content-Security-Policy` con `connect-src 'self'` limita las
conexiones al propio sitio: la única petición que hace la aplicación es leer su `perfil.json`.
No hay ningún destino externo al que se puedan enviar datos, `script-src` no admite scripts
de fuera, y no hay CDN, analítica ni fuentes remotas.

**Tratamiento de las fotos.** Solo se aceptan JPG, PNG, WEBP, GIF y BMP de hasta 8 MB.
Los SVG se rechazan porque pueden contener scripts. Cada imagen se redibuja en un canvas
antes de guardarse, lo que **elimina los metadatos EXIF —incluida la ubicación GPS—** y
cualquier carga incrustada en el archivo original. Al mostrarlas se exige el formato
`data:image/…`, de modo que un respaldo manipulado no puede inyectar atributos ni
provocar peticiones a servidores externos.

### Lo que no protege

**En modo local**, los datos guardados en el navegador no están cifrados. El PIN impide
verlos desde la aplicación, pero alguien con acceso al equipo y conocimientos técnicos puede
leerlos desde el almacenamiento del navegador. En un equipo compartido, usa además el
bloqueo de sesión del sistema operativo y una cuenta de usuario propia. Publicar un perfil
cifrado resuelve esto: a partir de ese momento no queda nada legible.

**En modo perfil**, el archivo publicado es susceptible de ataque sin conexión, como se
explica arriba. La fortaleza del sistema es exactamente la de tu frase de acceso.

En ambos casos, si olvidas la clave **no hay forma de recuperar los datos**. No existe
ningún servidor que pueda restablecerla.

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
index.html          Aplicación completa (estilos, lógica y datos de ejemplo)
perfil.json         Datos cifrados, si has publicado un perfil (lo genera la app)
publicar-perfil.bat Mueve perfil.json desde Descargas y lo sube al repositorio
404.html            Página de error de GitHub Pages
.nojekyll           Desactiva el procesado de Jekyll
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
