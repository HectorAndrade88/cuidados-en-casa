/* ============================================================
   Verificación de seguridad, cifrado, bloqueo y fotos.
   Se ejecuta el código real de index.html sobre un DOM simulado
   y la Web Crypto auténtica de Node.
   ============================================================ */
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');

const html = fs.readFileSync('index.html', 'utf8');
let code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
code = code.replace('const app = new App();', 'globalThis.app = new App();');
// Las clases y funciones son de ámbito léxico: se exponen para poder probarlas
code += '\n;globalThis.__api = { Vault, Profile, PinLock, ImageTools, Phone, Modal, MedicationSchedule, Medication, Inventory, isoDate, addDays, daysBetween, safeImage, SIN_FOTO, escapeHtml, StorageManager, uuid, B64, SECURE, ready };';

let pass = 0, fail = 0;
const ok  = (c, t) => { c ? (pass++, console.log('  OK   ' + t)) : (fail++, console.log('  FALLA ' + t)); };
const sec = t => console.log('\n== ' + t + ' ==');

/* ---------- DOM simulado ---------- */
function makeEl(id = ''){
  const el = {
    _id:id, _html:'', textContent:'', value:'', hidden:false, disabled:false,
    dataset:{}, style:{}, options:[], selectedIndex:0, elements:{}, files:[],
    classList:{
      _s:new Set(),
      toggle(c,f){ f ? this._s.add(c) : this._s.delete(c); },
      add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
      contains(c){ return this._s.has(c); }
    },
    set innerHTML(v){ this._html = String(v); }, get innerHTML(){ return this._html; },
    setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; },
    focus(){}, click(){}, appendChild(){}, remove(){}, blur(){},
    addEventListener(){}, removeEventListener(){}, reportValidity(){ return true; },
    querySelector(){ return makeEl('sub'); }, querySelectorAll(){ return []; },
    closest(){ return null; }, getContext(){ return { fillStyle:'', fillRect(){}, drawImage(){} }; },
    toDataURL(){ return 'data:image/jpeg;base64,' + 'A'.repeat(400); },
    onclick:null, onchange:null, oninput:null, onsubmit:null, onkeydown:null,
    width:0, height:0
  };
  return el;
}
const els = {};
const getEl = id => (els[id] ||= makeEl(id));
const document = {
  getElementById:getEl,
  querySelector(sel){ return getEl(sel.replace(/^#/, '')); },
  querySelectorAll(){ return []; },
  createElement(t){ return makeEl(t); },
  addEventListener(){}, removeEventListener(){},
  body:makeEl('body'), activeElement:null
};

/* ---------- localStorage simulado, con cuota controlable ---------- */
function makeStorage(){
  const datos = new Map();
  return {
    _datos:datos, _lleno:0,
    get length(){ return datos.size; },
    key(i){ return [...datos.keys()][i] ?? null; },
    getItem(k){ return datos.has(k) ? datos.get(k) : null; },
    setItem(k, v){
      if(this._lleno > 0){ this._lleno--; const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      datos.set(k, String(v));
    },
    removeItem(k){ datos.delete(k); }
  };
}
const localStorage = makeStorage();

/* ---------- Contexto global ---------- */
const crypto = webcrypto;
if(!crypto.randomUUID) crypto.randomUUID = () => require('crypto').randomUUID();

const sandbox = {
  document, localStorage, crypto, console,
  TextEncoder, TextDecoder, btoa, atob, Uint8Array, Math, Date, JSON, Promise, Error, Object, Array, String, Number,
  setTimeout:(f, ms) => setTimeout(f, Math.min(ms || 0, 5)),
  clearTimeout:t => clearTimeout(t),
  setInterval:() => 0, clearInterval:() => {},
  fetch:undefined,   // sin perfil publicado: la app arranca en modo local
  Notification:undefined, Image:function(){},
  FileReader:function(){ this.readAsText = () => {}; this.readAsDataURL = () => {}; },
  Blob:function(){}, URL:{ createObjectURL:() => 'blob:x', revokeObjectURL(){} },
  isSecureContext:true, location:{ reload(){} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

try{ vm.runInContext(code, sandbox); }
catch(e){ console.log('ERROR al iniciar la aplicación:', e.message); process.exit(1); }

const app = sandbox.app;
const { Vault, Profile, PinLock, ImageTools, Phone, Modal, MedicationSchedule, Medication, Inventory,
        isoDate, addDays, daysBetween, safeImage, SIN_FOTO, uuid, B64, SECURE, ready } = sandbox.__api;

(async () => {
  await ready;   // el arranque es asíncrono: primero se busca el perfil publicado

  sec('Arranque vacío y contenido genérico');
  ok(!!app, 'la aplicación arranca sin errores');
  ok(app.state.medications.length === 0, 'no llega ningún medicamento inventado');
  ok(app.state.caregivers.length === 0 && app.state.history.length === 0, 'tampoco cuidadores ni historial');
  ok(app.state.patient.name === '' && app.state.patient.registrado === false, 'no hay ningún paciente supuesto');
  ok(app.state.agenda.length === 0, 'la agenda arranca vacía');
  ok(app.onboardingHTML().includes('Primeros pasos'), 'se ofrece el asistente de primeros pasos');
  ok(app.onboardingHTML().includes('Pendiente'), 'los pasos aparecen como pendientes');
  ok(/Buenos días|Buenas tardes|Buenas noches/.test(app.greeting()), 'el saludo se adapta a la hora');
  ok(!app.greeting().includes(','), 'sin paciente registrado el saludo no nombra a nadie');

  ok(!/María González/.test(html), 'no queda ningún nombre de paciente escrito en el código');
  // La única mención que queda es el nombre de la clave antigua de almacenamiento
  ok(!/paliativ/i.test(html.replace(/cuida-paliativos-v1/g, '')),
     'no se presupone ninguna enfermedad ni especialidad concreta');
  ok(!/Cáncer|oncolog/i.test(html), 'ni diagnósticos concretos en los textos');
  ok(/Paciente de ejemplo/.test(html), 'los datos de muestra se identifican como ejemplo');
  ok(typeof app.demoData === 'function' && typeof app.loadDemo === 'function', 'la demo existe pero solo bajo petición');

  // Los datos guardados con el nombre de clave anterior no se pierden
  const almacen = app.store;
  localStorage.setItem('cuida-paliativos-v1', JSON.stringify({patient:{name:'Antiguo'}, medications:[]}));
  localStorage.removeItem(almacen.key);
  const rescatado = almacen.load();
  ok(rescatado && rescatado.patient.name === 'Antiguo', 'se recuperan los datos guardados con la clave anterior');
  ok(localStorage.getItem('cuida-paliativos-v1') === null, 'y se reubican bajo el nombre nuevo');

  // El resto de las pruebas trabaja sobre los datos de ejemplo
  app.state = app.demoData(); app.migrate();
  ok(app.state.medications.length === 4, 'la demo carga los medicamentos de muestra');
  ok(app.state.patient.registrado, 'la demo trae un paciente de ejemplo');
  ok(app.onboardingHTML() === '', 'con todo completo el asistente desaparece');
  ok(app.greeting().includes(','), 'con paciente registrado el saludo lo nombra');

  sec('Compatibilidad con datos anteriores');
  ok(app.state.settings.autolock === 5, 'añade el ajuste de autobloqueo');
  ok(app.state.settings.medView === 'tabla', 'añade la vista de medicamentos');
  ok(app.state.settings.lastBackup === '', 'registra que aún no hay respaldo');

  const guardado = JSON.parse(JSON.stringify(app.state));
  app.state = { patient:{name:'Ana'}, medications:[{id:'1', name:'X', times:['08:00']}],
                agenda:[], settings:{dark:true} };
  app.migrate();
  ok(Array.isArray(app.state.caregivers), 'un respaldo antiguo sin cuidadores no rompe la app');
  ok(app.state.settings.autolock === 5 && app.state.settings.dark === true, 'conserva ajustes antiguos y añade los nuevos');
  ok(app.state.medications[0].unit === 'mg', 'completa los campos que faltan en medicamentos antiguos');
  ok(Array.isArray(app.state.symptoms) && Array.isArray(app.state.history), 'crea las listas que faltaban');
  app.state = guardado; app.migrate();

  sec('Cifrado del respaldo (AES-GCM 256 + PBKDF2-SHA256)');
  const sobre = await Vault.encrypt({ secreto:'historia clínica', n:42 }, 'ClaveFuerte#2026');
  ok(sobre.cipher === 'AES-GCM-256' && sobre.kdf === 'PBKDF2-SHA256', 'declara el algoritmo empleado');
  ok(sobre.iterations === 600000, 'usa 600 000 iteraciones de PBKDF2 (recomendación OWASP vigente)');
  ok(!JSON.stringify(sobre).includes('historia clínica'), 'el texto en claro no aparece en el archivo');
  ok(Vault.isEncrypted(sobre), 'reconoce su propio formato cifrado');
  ok(!Vault.isEncrypted({ patient:{}, medications:[] }), 'distingue un respaldo antiguo sin cifrar');

  const claro = await Vault.decrypt(sobre, 'ClaveFuerte#2026');
  ok(claro.secreto === 'historia clínica' && claro.n === 42, 'descifra con la contraseña correcta');

  let malaClave = false;
  try{ await Vault.decrypt(sobre, 'ClaveEquivocada'); }catch{ malaClave = true; }
  ok(malaClave, 'rechaza una contraseña incorrecta');

  const alterado = { ...sobre };
  const bytes = Buffer.from(sobre.data, 'base64'); bytes[5] ^= 0xff;
  alterado.data = bytes.toString('base64');
  let detectado = false;
  try{ await Vault.decrypt(alterado, 'ClaveFuerte#2026'); }catch{ detectado = true; }
  ok(detectado, 'detecta un archivo manipulado (autenticidad de GCM)');

  const otro = await Vault.encrypt({ secreto:'historia clínica', n:42 }, 'ClaveFuerte#2026');
  ok(otro.salt !== sobre.salt && otro.iv !== sobre.iv, 'genera sal e IV nuevos en cada exportación');
  ok(otro.data !== sobre.data, 'el mismo contenido produce cifrados distintos');

  const grande = await Vault.encrypt({ foto:'data:image/jpeg;base64,' + 'B'.repeat(300000) }, 'clave12345678');
  const vuelta = await Vault.decrypt(grande, 'clave12345678');
  ok(vuelta.foto.length === 300000 + 23, 'cifra y recupera respaldos con fotos grandes');

  sec('Bloqueo con PIN');
  const pin = app.pin;
  await pin.set('4821');
  const cfg = pin.config();
  ok(pin.enabled(), 'el PIN queda activado');
  ok(!JSON.stringify(cfg).includes('4821'), 'el PIN no se guarda en claro en ningún campo');
  ok(cfg.hash && cfg.salt && cfg.iterations === 600000, 'guarda huella, sal e iteraciones');
  ok(await pin.verify('4821') === true, 'acepta el PIN correcto');
  ok(await pin.verify('1234') === false, 'rechaza un PIN incorrecto');
  ok(pin.equalTime('abc','abc') && !pin.equalTime('abc','abd'), 'compara en tiempo constante');

  await pin.set('1111'); const h1 = pin.config().hash;
  await pin.set('1111'); const h2 = pin.config().hash;
  ok(h1 !== h2, 'la sal hace que el mismo PIN dé huellas distintas');
  await pin.set('4821');

  pin.resetFails();
  ok(pin.waitMs() === 0, 'sin fallos no hay espera');
  pin.addFail(); pin.addFail();
  ok(pin.waitMs() === 0, 'los dos primeros fallos no penalizan');
  pin.addFail();
  const e3 = pin.waitMs();
  ok(e3 > 4000, 'al tercer fallo aparece un retardo de espera');
  pin.addFail();
  ok(pin.waitMs() > e3, 'el retardo crece con cada fallo nuevo');
  pin.resetFails();

  app.lock(true);
  ok(app.locked === true, 'bloquea la aplicación');
  ok(document.getElementById('lock').hidden === false, 'muestra la pantalla de bloqueo');
  ok(document.body.classList.contains('locked'), 'oculta la app mientras está bloqueada');

  getEl('lockPin').value = '0000';
  await app.tryUnlock();
  ok(app.locked === true, 'no desbloquea con un PIN erróneo');
  ok(getEl('lockErr').textContent.includes('incorrecto'), 'avisa del PIN incorrecto');
  pin.resetFails();
  getEl('lockPin').value = '4821';
  await app.tryUnlock();
  ok(app.locked === false, 'desbloquea con el PIN correcto');

  app.state.settings.autolock = 1;
  app.lastActivity = Date.now() - 2 * 60000;
  app.checkIdle();
  ok(app.locked === true, 'se bloquea solo tras la inactividad configurada');
  pin.resetFails(); getEl('lockPin').value = '4821'; await app.tryUnlock();

  app.state.settings.autolock = 0;
  app.lastActivity = Date.now() - 60 * 60000;
  app.checkIdle();
  ok(app.locked === false, 'con autobloqueo en «Nunca» no se bloquea');
  app.state.settings.autolock = 5;

  pin.clear();
  ok(!pin.enabled(), 'se puede quitar el PIN');
  app.lock();
  ok(app.locked === false, 'sin PIN configurado no hay bloqueo que mostrar');

  sec('Fotos: validación de archivos y saneado');
  const archivo = (type, size) => ({ type, size, name:'f' });
  const err = async f => { try{ await ImageTools.fromFile(f); return ''; }catch(e){ return e.message; } };
  ok((await err(archivo('image/svg+xml', 1000))).includes('SVG'), 'rechaza SVG (pueden contener scripts)');
  ok((await err(archivo('application/pdf', 1000))).includes('Formato'), 'rechaza un PDF disfrazado de imagen');
  ok((await err(archivo('text/html', 1000))).includes('Formato'), 'rechaza un HTML disfrazado de imagen');
  ok((await err(archivo('image/jpeg', 9e6))).includes('8 MB'), 'rechaza imágenes de más de 8 MB');
  ok((await err(null)).length > 0, 'avisa si no se seleccionó nada');

  const r = ImageTools.normalize({ naturalWidth:4000, naturalHeight:3000 });
  ok(r.width === 720 && r.height === 540, 'reduce el lado mayor a 720 px conservando la proporción');
  ok(r.dataUrl.startsWith('data:image/jpeg'), 're-codifica a JPEG: elimina EXIF y ubicación');
  ok(ImageTools.normalize({ naturalWidth:100, naturalHeight:80 }).width === 100, 'no amplía las imágenes pequeñas');
  ok(ImageTools.normalize({ naturalWidth:3000, naturalHeight:4000 }).height === 720, 'funciona también en vertical');
  ok(ImageTools.kb('data:image/jpeg;base64,' + 'A'.repeat(4096)) === 3, 'calcula el peso real de la foto');
  ok(ImageTools.bytes('') === 0, 'un medicamento sin foto pesa cero');

  sec('Saneado de imágenes al mostrarlas');
  ok(safeImage('data:image/jpeg;base64,AAA').startsWith('data:image/jpeg'), 'acepta fotos legítimas');
  ok(safeImage('javascript:alert(1)') === SIN_FOTO, 'bloquea javascript: en el atributo src');
  ok(safeImage('https://externo.com/a.png') === SIN_FOTO, 'bloquea imágenes externas (evita fugas por petición)');
  ok(!safeImage('data:image/png;base64,x" onerror="alert(1)').includes('onerror="'), 'escapa comillas: no se puede inyectar onerror');
  ok(safeImage(undefined) === SIN_FOTO && safeImage({}) === SIN_FOTO, 'tolera valores ausentes o corruptos');
  ok(safeImage('data:image/svg+xml;charset=utf-8,%3Csvg') !== SIN_FOTO, 'mantiene los iconos de ejemplo en SVG');

  sec('Escapado de texto en las vistas');
  const m0 = app.state.medications[0], nombre = m0.name;
  m0.name = '<img src=x onerror=alert(1)>';
  app.state.settings.medView = 'galeria';
  const galeria = app.medsHTML();
  ok(!galeria.includes('<img src=x'), 'la galería escapa el HTML de los nombres');
  ok(galeria.includes('&lt;img src=x'), 'muestra el texto escapado');
  app.state.settings.medView = 'tabla';
  ok(app.medsHTML().includes('&lt;img src=x'), 'la tabla también lo escapa');
  m0.name = nombre;

  m0.photo = 'javascript:alert(1)';
  ok(!app.medsHTML().includes('javascript:alert'), 'una foto maliciosa importada no llega al HTML');
  m0.photo = 'data:image/jpeg;base64,AAA';

  sec('Validación de lo que se importa');
  ok(app.validState(app.state), 'acepta un estado correcto');
  ok(!app.validState(null) && !app.validState('texto') && !app.validState([]), 'rechaza valores que no son un estado');
  ok(!app.validState({ patient:{}, medications:'no-es-lista' }), 'rechaza una lista de medicamentos inválida');
  ok(!app.validState({ medications:[] }), 'exige los datos del paciente');

  sec('Respaldo automático dentro del navegador');
  const store = app.store;
  app.save();
  ok(!!store.load(), 'guarda el estado actual');
  const copias = store.snapshots();
  ok(copias.length >= 1, 'crea una copia diaria');
  const ligera = JSON.parse(copias[0].data);
  ok(ligera.medications.every(x => x.photo === ''), 'la copia diaria no incluye fotos');
  ok(ligera.patient && ligera.history !== undefined, 'la copia diaria conserva paciente e historial');
  app.save(); app.save();
  ok(store.snapshots().length === copias.length, 'no duplica copias dentro de la misma hora');
  ok(store.usedBytes() > 0, 'informa del espacio ocupado');
  ok(!!store.previous(), 'conserva el estado inmediatamente anterior');

  sec('Comportamiento cuando el navegador se queda sin espacio');
  localStorage._lleno = 1;              // falla al escribir mientras no hay hueco
  const res = store.save(app.state);
  ok(res.ok === true && res.warning === 'copias-liberadas', 'libera las copias y consigue guardar los datos');
  ok(store.snapshots().length === 0, 'las copias se sacrifican antes que los datos del paciente');
  localStorage._lleno = 99;             // no hay forma de guardar
  const res2 = store.save(app.state);
  ok(res2.ok === false && res2.error === 'cuota', 'informa del fallo cuando ya no cabe nada');
  localStorage._lleno = 0;

  sec('Fichas, visor y navegación');
  let sinFallo = true;
  try{
    app.medDetail(app.state.medications[0].id);
    app.photoViewer(app.state.medications[0].id);
    app.securityHTML(); app.backupHTML(); app.settingsHTML();
    app.homeHTML(); app.treatmentHTML(); app.caregiversHTML(); app.recordHTML();
  }catch(e){ sinFallo = false; console.log('     ' + e.message); }
  ok(sinFallo, 'todas las vistas y diálogos se generan sin errores');
  ok(app.medDetail('inexistente') === undefined, 'un identificador desconocido no rompe la ficha');
  ok(app.formatBytes(500) === '500 B' && app.formatBytes(2 * 1024 * 1024) === '2.00 MB', 'muestra los tamaños en unidades legibles');

  sec('Celular: normalización de números');
  ok(Phone.intl('300 123 4567') === '573001234567', 'un celular colombiano de 10 dígitos recibe el indicativo 57');
  ok(Phone.intl('+57 300 123 4567') === '573001234567', 'acepta el número ya escrito con +57');
  ok(Phone.intl('0057 300 123 4567') === '573001234567', 'acepta el prefijo internacional 00');
  ok(Phone.intl('(300) 123-4567') === '573001234567', 'ignora paréntesis, guiones y espacios');
  ok(Phone.intl('+52 55 1234 5678') === '525512345678', 'respeta el indicativo de otro país');
  ok(Phone.intl('') === '' && Phone.intl(null) === '', 'un campo vacío no genera número');
  ok(Phone.valid('300 123 4567') && !Phone.valid('123'), 'distingue números utilizables de los que no lo son');
  ok(!Phone.valid('1234567890123456789'), 'rechaza números más largos de lo que permite E.164');
  ok(Phone.pretty('3001234567') === '+573001234567', 'muestra el número en formato internacional');

  sec('Enlace de WhatsApp (sin API ni credenciales)');
  const enlace = Phone.waLink('300 123 4567', 'Hola\nsegunda línea & signo=1');
  ok(enlace.startsWith('https://wa.me/573001234567?text='), 'usa el enlace oficial wa.me con el número normalizado');
  ok(enlace.includes('%0A'), 'codifica los saltos de línea del mensaje');
  ok(enlace.includes('%26') && enlace.includes('%3D'), 'codifica los signos & e = que romperían la URL');
  ok(!/api[_-]?key|access[_-]?token|client[_-]?secret|Bearer\s|Authorization\s*:/i.test(html),
     'no hay ninguna credencial ni token en el archivo');
  ok(!/graph\.facebook|api\.whatsapp\.com\/send\?.*token/i.test(html), 'no se usa la API de WhatsApp Business');

  sec('Aviso tras administrar una dosis');
  const medAviso = app.state.medications[0];
  const cuidadores = app.state.caregivers;
  cuidadores[0].name = 'Ana Rodríguez'; cuidadores[0].phone = '300 123 4567';
  cuidadores[0].medIds = [medAviso.id];
  cuidadores[1].name = 'Enfermería'; cuidadores[1].phone = '3019998877'; cuidadores[1].medIds = [];

  const agendaItem = { time:'08:00', actual:new Date('2026-07-26T13:05:00Z').toISOString() };
  const mensaje = app.waMessage(medAviso, agendaItem, 'Ana Rodríguez');
  ok(mensaje.includes(app.state.patient.name), 'el mensaje nombra al paciente');
  ok(mensaje.includes(medAviso.name) && mensaje.includes(medAviso.dose), 'el mensaje incluye medicamento y dosis');
  ok(mensaje.includes('08:00'), 'el mensaje incluye la hora programada');
  ok(mensaje.includes('Ana Rodríguez'), 'el mensaje indica quién administró');

  const dest = app.waRecipients(medAviso, 'Ana Rodríguez');
  ok(!dest.asignados.concat(dest.otros).some(c => c.name === 'Ana Rodríguez'), 'no se avisa a quien acaba de administrar');
  ok(dest.otros.some(c => c.name === 'Enfermería'), 'se ofrece avisar al resto del equipo');
  const destSinTel = app.waRecipients(medAviso, 'Nadie');
  ok(destSinTel.asignados.every(c => Phone.valid(c.phone)), 'solo aparecen cuidadores con celular utilizable');

  cuidadores[1].medIds = [medAviso.id];
  const dest2 = app.waRecipients(medAviso, 'Ana Rodríguez');
  ok(dest2.asignados.some(c => c.name === 'Enfermería'), 'los responsables del medicamento se listan primero');

  let abrio = false;
  const openReal = Modal.open;
  Modal.open = function(h){ abrio = true; return openReal.call(this, h); };
  app.state.settings.whatsapp = false;
  app.whatsappNotice(agendaItem, medAviso, 'Ana Rodríguez');
  ok(abrio === false, 'con el aviso desactivado en Ajustes no se muestra nada');
  app.state.settings.whatsapp = true;
  app.whatsappNotice(agendaItem, medAviso, 'Ana Rodríguez');
  ok(abrio === true, 'con el aviso activado se ofrece la lista de destinatarios');
  abrio = false;
  const sinNadie = app.state.caregivers;
  app.state.caregivers = [];
  app.whatsappNotice(agendaItem, medAviso, 'Ana Rodríguez');
  ok(abrio === false, 'sin cuidadores con celular no se interrumpe al usuario');
  app.state.caregivers = sinNadie;
  Modal.open = openReal;

  sec('Escapado en los enlaces de WhatsApp');
  cuidadores[0].name = 'Ana" onmouseover="alert(1)';
  const tarjetas = app.caregiversHTML();
  ok(!tarjetas.includes('onmouseover="alert'), 'un nombre malicioso no puede romper el atributo href');
  ok(tarjetas.includes('wa.me/573001234567'), 'la tarjeta del cuidador ofrece el botón de WhatsApp');
  cuidadores[0].name = 'Ana Rodríguez';
  const telefonos = cuidadores.map(c => c.phone);
  cuidadores.forEach(c => c.phone = '');
  ok(!app.caregiversHTML().includes('wa.me'), 'sin celular no aparece el botón de WhatsApp');
  cuidadores.forEach((c, i) => c.phone = telefonos[i]);

  sec('Pautas: cada cuántos días toca');
  const MS = MedicationSchedule;
  const med = o => new Medication(Object.assign({name:'X', times:['08:00'], startDate:'2026-07-01'}, o));

  const diaria = med({});
  ok(MS.appliesOn(diaria, '2026-07-01') && MS.appliesOn(diaria, '2026-07-02'), 'la pauta diaria toca todos los días');

  const cada3 = med({pattern:'cada', everyDays:3});
  ok(MS.appliesOn(cada3, '2026-07-01'), 'cada 3 días toca el día de inicio');
  ok(!MS.appliesOn(cada3, '2026-07-02') && !MS.appliesOn(cada3, '2026-07-03'), 'los dos días intermedios no toca');
  ok(MS.appliesOn(cada3, '2026-07-04'), 'vuelve a tocar al tercer día');
  ok(MS.appliesOn(cada3, '2026-07-31'), 'el ciclo se mantiene un mes después');
  ok(!MS.appliesOn(cada3, '2026-06-28'), 'antes de la fecha de inicio no toca');

  const cada2 = med({pattern:'cada', everyDays:2});
  ok(MS.appliesOn(cada2, '2026-07-03') && !MS.appliesOn(cada2, '2026-07-04'), 'un día sí y otro no');

  // 2026-07-06 es lunes
  const semanal = med({pattern:'semana', weekdays:[1,3,5]});
  ok(MS.appliesOn(semanal, '2026-07-06'), 'la pauta semanal toca el lunes');
  ok(!MS.appliesOn(semanal, '2026-07-07'), 'no toca el martes');
  ok(MS.appliesOn(semanal, '2026-07-08') && MS.appliesOn(semanal, '2026-07-10'), 'toca miércoles y viernes');
  ok(!MS.appliesOn(semanal, '2026-07-11'), 'no toca el sábado');

  const conFin = med({pattern:'cada', everyDays:3, endDate:'2026-07-10'});
  ok(MS.appliesOn(conFin, '2026-07-10'), 'el último día del tratamiento aún toca');
  ok(!MS.appliesOn(conFin, '2026-07-13'), 'después del fin del tratamiento ya no se programa');

  const inactivo = med({active:false});
  ok(!MS.appliesOn(inactivo, '2026-07-01'), 'un medicamento inactivo no se programa');

  sec('Inventario sin horario de aplicación (según necesidad)');
  const demanda = med({pattern:'demanda', times:['08:00'], stock:12, minStock:4, startDate:'2026-07-01', endDate:'2026-08-01'});
  ok(demanda.times.length === 0, 'al marcarlo según necesidad se descartan los horarios');
  ok(demanda.startDate === '' && demanda.endDate === '', 'tampoco conserva fechas de aplicación');
  ok(MS.onDemand(demanda), 'queda identificado como medicamento sin horario');
  ok(!MS.appliesOn(demanda, '2026-07-01') && !MS.appliesOn(demanda, '2026-12-25'), 'no toca ningún día: nunca se programa solo');
  ok(MS.forDate([demanda], '2026-07-01').length === 0, 'no genera entradas en la agenda');
  ok(MS.describe(demanda) === 'Según necesidad · sin horario fijo', 'se describe con claridad');
  ok(MS.dosesPerDay(demanda) === 0, 'no tiene consumo diario previsible');
  ok(Inventory.days(demanda) === null, 'no se inventa una duración del inventario');
  ok(Inventory.daysText(demanda) === 'sin consumo previsible', 'lo dice en vez de mostrar cero días');
  ok(Inventory.level(demanda) === 'ok' && Inventory.level(med({pattern:'demanda', stock:2, minStock:4})) === 'low',
     'la alerta de stock bajo sigue funcionando sin horario');

  const soloInventario = new Medication({name:'Gasas', pattern:'demanda', stock:30, minStock:10});
  ok(soloInventario.times.length === 0 && MS.forDate([soloInventario]).length === 0,
     'se puede llevar inventario de algo que no se administra por reloj');
  ok(MS.nextDate(soloInventario, '2026-07-01', 10) === null, 'no hay próxima fecha que calcular');

  const mezcla = [ med({name:'Programado', times:['08:00']}), soloInventario ];
  ok(MS.forDate(mezcla, '2026-07-01').length === 1, 'conviven medicamentos con y sin horario');

  sec('Pautas: descripción y próxima fecha');
  ok(MS.describe(diaria) === 'Todos los días', 'describe la pauta diaria');
  ok(MS.describe(cada3) === 'Cada 3 días', 'describe el intervalo de tres días');
  ok(MS.describe(cada2) === 'Un día sí y otro no', 'describe el día por medio en lenguaje natural');
  ok(MS.describe(semanal).includes('lunes') && MS.describe(semanal).includes('viernes'), 'describe los días de la semana');
  ok(MS.describe(conFin).includes('hasta el 2026-07-10'), 'indica el fin del tratamiento');

  ok(MS.nextDate(cada3, '2026-07-02') === '2026-07-04', 'calcula la próxima fecha de una pauta cada 3 días');
  ok(MS.nextDate(semanal, '2026-07-07') === '2026-07-08', 'calcula el próximo día de la semana marcado');
  ok(MS.nextDate(conFin, '2026-07-11') === null, 'no hay próxima vez tras el fin del tratamiento');

  sec('Pautas: agenda del día e inventario');
  const tresMeds = [ med({name:'A', times:['08:00','20:00']}),
                     med({name:'B', pattern:'cada', everyDays:3, times:['09:00']}),
                     med({name:'C', pattern:'semana', weekdays:[1], times:['10:00']}) ];
  const agenda1 = MS.forDate(tresMeds, '2026-07-01');   // miércoles, día de inicio
  ok(agenda1.length === 3, 'la agenda incluye solo lo que toca ese día');
  ok(agenda1[0].time === '08:00' && agenda1.at(-1).time === '20:00', 'la agenda sale ordenada por hora');
  const agenda2 = MS.forDate(tresMeds, '2026-07-02');
  ok(agenda2.length === 2, 'al día siguiente desaparece la pauta de cada 3 días');
  ok(MS.forDate(tresMeds, '2026-07-06').some(a => a.time === '10:00'), 'el lunes aparece la pauta semanal');

  const previa = MS.forDate(tresMeds, '2026-07-01');
  previa[0].status = 'administered'; previa[0].responsible = 'Ana';
  const fusionada = MS.merge(previa, MS.forDate(tresMeds, '2026-07-01'));
  ok(fusionada.filter(a => a.status === 'administered').length === 1,
     'al editar un medicamento se conservan las dosis ya registradas');

  ok(MS.dosesPerDay(med({times:['08:00','20:00']})) === 2, 'dos tomas diarias son dos dosis al día');
  ok(MS.dosesPerDay(med({pattern:'cada', everyDays:3, times:['08:00']})) - 1/3 < 1e-9, 'cada 3 días equivale a un tercio de dosis diaria');
  ok(Math.abs(MS.dosesPerDay(med({pattern:'semana', weekdays:[1,3,5], times:['08:00']})) - 3/7) < 1e-9, 'tres días por semana son 3/7 de dosis diaria');
  ok(Inventory.days(med({pattern:'cada', everyDays:3, times:['08:00'], stock:10})) === 30,
     'el inventario dura el triple con una pauta de cada 3 días');
  ok(Inventory.days(med({times:['08:00','20:00'], stock:10})) === 5, 'con dos tomas al día el stock rinde la mitad');

  sec('Pautas: compatibilidad y cambio de día');
  const antiguo = new Medication({name:'Viejo', times:['08:00']});
  ok(antiguo.pattern === 'diaria', 'un medicamento sin pauta se considera diario');
  ok(antiguo.startDate === isoDate(), 'se le asigna la fecha de hoy como inicio');
  ok(new Medication({everyDays:999}).everyDays === 60, 'el intervalo se limita a un máximo razonable');
  ok(new Medication({pattern:'inventado'}).pattern === 'diaria', 'una pauta desconocida cae en diaria');
  ok(new Medication({weekdays:'lunes'}).weekdays.length === 0, 'unos días de la semana corruptos no rompen nada');

  app.state.agendaDate = '2000-01-01';
  ok(app.syncAgenda() === true, 'al cambiar el día se detecta que la agenda es vieja');
  ok(app.state.agendaDate === isoDate(), 'la agenda queda fechada hoy');
  ok(app.syncAgenda() === false, 'dentro del mismo día no se vuelve a recrear');

  ok(addDays('2026-07-30', 3) === '2026-08-02', 'sumar días cruza el cambio de mes');
  ok(addDays('2026-12-31', 1) === '2027-01-01', 'y también el cambio de año');
  ok(daysBetween('2026-02-27', '2026-03-01') === 2, 'contar días respeta la duración real del mes');

  sec('Perfil cifrado compartido entre dispositivos');
  const CLAVE = 'frase larga de prueba 2026';
  const sobrePerfil = await Vault.encrypt(app.state, CLAVE);
  ok(Vault.isEncrypted(sobrePerfil), 'el perfil se genera como sobre cifrado');
  ok(!JSON.stringify(sobrePerfil).includes(app.state.patient.name), 'el nombre del paciente no aparece en el archivo publicado');

  // La clave se deriva UNA vez y se reutiliza: sellar debe ser instantáneo
  const claveDerivada = await Vault.keyFor(sobrePerfil, CLAVE);
  const sellado = await Vault.sealWith(claveDerivada, {x:1}, B64.to(sobrePerfil.salt), sobrePerfil.iterations);
  ok((await Vault.openWith(claveDerivada, sellado)).x === 1, 'sellar y abrir con la clave ya derivada funciona');
  ok(sellado.iv !== sobrePerfil.iv, 'cada sellado usa un IV nuevo');

  ok(await Profile.published() === null, 'sin fetch disponible no se inventa ningún perfil publicado');

  // Paso a modo perfil
  const estadoOriginal = JSON.parse(JSON.stringify(app.state));
  app.mode = 'perfil';
  app.published = sobrePerfil;
  app.pass = CLAVE;
  app.cacheKey = claveDerivada;
  app.cacheSalt = B64.to(sobrePerfil.salt);
  app.cacheIter = sobrePerfil.iterations;
  app.lockEl = document.getElementById('lock');

  app.store.wipePlain();
  ok(app.store.load() === null && app.store.snapshots().length === 0, 'al pasar a perfil se borra todo rastro legible');

  app.save();
  await new Promise(r => setTimeout(r, 80));
  const copia = Profile.cache();
  ok(copia && Vault.isEncrypted(copia), 'la copia local del navegador queda cifrada');
  ok(!JSON.stringify(copia).includes(estadoOriginal.patient.name), 'la copia local no contiene texto legible');
  ok(app.store.load() === null, 'en modo perfil no se escribe ninguna copia en claro');

  const recuperado = await Vault.openWith(claveDerivada, copia);
  ok(recuperado.patient.name === estadoOriginal.patient.name, 'la copia local se puede volver a abrir con la clave');
  ok(!!recuperado.updatedAt, 'cada guardado deja marca de tiempo para comparar dispositivos');

  ok(await app.openProfile('clave equivocada larga') === false, 'una clave incorrecta no abre nada');
  ok(await app.openProfile(CLAVE) === true, 'la clave correcta descifra y abre la aplicación');
  ok(app.state.patient.name === estadoOriginal.patient.name, 'tras abrir, los datos son los del perfil');
  ok(app.locked === false, 'tras descifrar se levanta el bloqueo');

  app.lock(true);
  ok(app.state === null && app.pass === null && app.cacheKey === null,
     'al bloquear se descartan de memoria la clave y los datos descifrados');
  ok(app.locked === true, 'la puerta vuelve a estar cerrada');
  ok(app.autolockMinutes() >= 0, 'el tiempo de autobloqueo se conoce antes de descifrar');

  await app.openProfile(CLAVE);
  ok(app.state !== null, 'se puede volver a entrar con la clave');
  ok(Profile.when(sobrePerfil) > 0, 'el perfil publicado lleva fecha para detectar conflictos');

  Profile.clearCache();
  ok(Profile.cache() === null, 'la copia local cifrada se puede eliminar');
  app.mode = 'local'; app.state = estadoOriginal; app.published = null;

  sec('Política de seguridad del sitio publicado');
  ok(/connect-src 'self'/.test(html) && !/connect-src[^;]*https?:/.test(html),
     'CSP: solo se permite leer del propio sitio, ningún destino externo');
  ok(/object-src 'none'/.test(html) && /frame-ancestors 'none'/.test(html), 'CSP: sin objetos incrustados ni iframes ajenos');
  ok(/script-src 'unsafe-inline'/.test(html) && !/script-src[^"]*https?:/.test(html), 'CSP: no admite scripts externos');
  ok(/base-uri 'none'/.test(html) && /form-action 'none'/.test(html), 'CSP: sin reescritura de base ni envío de formularios fuera');
  ok(/noindex/.test(html), 'pide a los buscadores no indexar la página');
  ok(!/<script[^>]+src=/.test(html), 'no carga ningún recurso de terceros');
  ok(!/(src|href)\s*=\s*["']https?:/i.test(html), 'ningún recurso se carga desde una URL externa');
  ok(!/XMLHttpRequest|navigator\.sendBeacon|new WebSocket|\.src\s*=\s*['"`]https?:/.test(html),
     'no hay canales alternativos de red: ni XHR, ni beacons, ni websockets');
  const fetches = html.match(/fetch\s*\(/g) || [];
  ok(fetches.length === 1 && /fetch\(this\.FILE/.test(html),
     'la única petición de red es la lectura del propio perfil.json');
  ok(!/googleapis|cdn|analytics|gtag/i.test(html), 'no hay CDN ni analítica de terceros');

  console.log(`\nResultado: ${pass} correctas, ${fail} fallidas\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR EN LAS PRUEBAS:', e); process.exit(1); });
