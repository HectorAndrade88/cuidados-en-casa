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
code += '\n;globalThis.__api = { Vault, PinLock, ImageTools, safeImage, SIN_FOTO, escapeHtml, StorageManager, uuid, B64, SECURE };';

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
  setInterval:() => 0, clearInterval:() => {},
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
const { Vault, PinLock, ImageTools, safeImage, SIN_FOTO, uuid, B64, SECURE } = sandbox.__api;

(async () => {
  sec('Arranque y compatibilidad con datos anteriores');
  ok(!!app, 'la aplicación arranca sin errores');
  ok(app.state.medications.length === 3, 'carga los medicamentos de ejemplo');
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
  ok(sobre.iterations === 310000, 'usa 310 000 iteraciones de PBKDF2');
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
  ok(cfg.hash && cfg.salt && cfg.iterations === 310000, 'guarda huella, sal e iteraciones');
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

  sec('Política de seguridad del sitio publicado');
  ok(/connect-src 'none'/.test(html), 'CSP: bloquea toda conexión saliente');
  ok(/object-src 'none'/.test(html) && /frame-ancestors 'none'/.test(html), 'CSP: sin objetos incrustados ni iframes ajenos');
  ok(/script-src 'unsafe-inline'/.test(html) && !/script-src[^"]*https?:/.test(html), 'CSP: no admite scripts externos');
  ok(/base-uri 'none'/.test(html) && /form-action 'none'/.test(html), 'CSP: sin reescritura de base ni envío de formularios fuera');
  ok(/noindex/.test(html), 'pide a los buscadores no indexar la página');
  ok(!/<script[^>]+src=/.test(html), 'no carga ningún recurso de terceros');
  ok(!/(src|href)\s*=\s*["']https?:/i.test(html), 'ningún recurso se carga desde una URL externa');
  ok(!/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|new WebSocket/.test(html), 'el código no hace ninguna petición de red');
  ok(!/googleapis|cdn|analytics|gtag/i.test(html), 'no hay CDN ni analítica de terceros');

  console.log(`\nResultado: ${pass} correctas, ${fail} fallidas\n`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('ERROR EN LAS PRUEBAS:', e); process.exit(1); });
