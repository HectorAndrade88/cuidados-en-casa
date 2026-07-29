/* ============================================================
   db.js · Capa de acceso a Firebase para "cuidados-en-casa"
   ------------------------------------------------------------
   Modelo 2 (BD real): datos legibles en Firestore, protegidos por
   login Google + reglas. Las fotos van a Storage y en el documento
   se guarda solo su URL.

   Uso desde index.html:
     <script type="module">
       import { CuidaDB } from './firebase/db.js';
       await CuidaDB.init();                     // conecta con Firebase
       CuidaDB.onAuth(user => { ... });          // reacciona al login/logout
       await CuidaDB.signIn();                    // abre el popup de Google
       const estado = await CuidaDB.loadState();  // mismo shape que la app usa hoy
     </script>

   Requiere: firebase/firebase-config.js  (copiado de firebase-config.example.js)
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  initializeAppCheck, ReCaptchaEnterpriseProvider
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

/* La configuración NO se importa de forma estática: si el archivo aún no existe
   (proyecto sin crear) no debe romperse toda la página. Se carga en init(). */

/* Fecha local YYYY-MM-DD, igual criterio que la app (día del dispositivo) */
function isoDate(d = new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* IDs de las colecciones/documentos: espejo de firebase/ESTRUCTURA.md */
const PATH = {
  paciente:     () => ['paciente', 'perfil'],
  ajustes:      () => ['ajustes', 'app'],
  medicamentos: 'medicamentos',
  cuidadores:   'cuidadores',
  sintomas:     'sintomas',
  rescates:     'rescates',
  historial:    'historial',
  agenda:       'agenda',
};

class CuidaDBClass{
  constructor(){
    this.app = null; this.auth = null; this.db = null; this.storage = null;
    this.appCheck = null;
    this.user = null;
    this._unsubs = [];
  }

  /* ---- Arranque y sesión --------------------------------- */
  /* Puedes pasar la config a mano; si no, se intenta cargar de
     ./firebase-config.js y, si falta, se avisa con un error claro. */
  async init(config){
    if(this.app) return this;
    if(!config){
      try{
        const module = await import('./firebase-config.js');
        config = module.firebaseConfig;
        this.appCheckSiteKey = module.appCheckSiteKey;
      }catch{
        throw new Error('Falta firebase-config.js: copia firebase-config.example.js a firebase-config.js y pega tus valores de Firebase.');
      }
    }
    this.app     = initializeApp(config);
    /* App Check debe arrancar ANTES de Firestore/Storage para que sus peticiones
       lleven el token. La clave de sitio de reCAPTCHA Enterprise es pública,
       pero solo funciona para los dominios autorizados en Google Cloud. */
    if(this.appCheckSiteKey){
      this.appCheck = initializeAppCheck(this.app, {
        provider: new ReCaptchaEnterpriseProvider(this.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    }else{
      console.warn('App Check aún no está configurado: agrega appCheckSiteKey en firebase/firebase-config.js.');
    }
    this.auth    = getAuth(this.app);
    this.db      = getFirestore(this.app);
    this.storage = getStorage(this.app);
    onAuthStateChanged(this.auth, u => { this.user = u; });
    return this;
  }
  /* Notifica login/logout. Devuelve función para dejar de escuchar. */
  onAuth(cb){ return onAuthStateChanged(this.auth, u => { this.user = u; cb(u); }); }
  async signIn(){
    const ua = navigator.userAgent || '';
    /* Los navegadores integrados de mensajería no ofrecen el almacenamiento
       temporal que requiere el handler OAuth de Firebase. */
    if(/WhatsApp|FBAN|FBAV|Instagram|Line\//i.test(ua)){
      const error = new Error('Abre este enlace en Safari, Edge o Chrome; el navegador integrado de WhatsApp no permite iniciar sesión con Google.');
      error.code = 'auth/unsupported-webview';
      throw error;
    }
    try{
      const probe = '__cuida_auth_probe__';
      sessionStorage.setItem(probe, '1'); sessionStorage.removeItem(probe);
    }catch{
      const error = new Error('Este navegador no permite el almacenamiento necesario para iniciar sesión. Abre la página en Safari, Edge o Chrome.');
      error.code = 'auth/web-storage-unsupported';
      throw error;
    }
    const prov = new GoogleAuthProvider();
    // En móviles, la redirección es más fiable que una ventana emergente.
    if(/Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua)){
      await signInWithRedirect(this.auth, prov);
      return null;
    }
    const cred = await signInWithPopup(this.auth, prov);
    this.user = cred.user;
    return cred.user;
  }
  async signOut(){ await signOut(this.auth); this.user = null; }
  get email(){ return this.user?.email || null; }

  /* ---- Lectura del estado completo ----------------------- */
  /* Devuelve el MISMO shape que usa la app hoy, para encajar sin
     reescribir la lógica de render/negocio. */
  async loadState(){
    const [pac, aj, meds, cuid, sint, resc, hist] = await Promise.all([
      this._getDoc(PATH.paciente()),
      this._getDoc(PATH.ajustes()),
      this._getCol(PATH.medicamentos),
      this._getCol(PATH.cuidadores),
      this._getCol(PATH.sintomas),
      this._getCol(PATH.rescates),
      this._getCol(PATH.historial),
    ]);
    const hoy = isoDate();
    const agendaDoc = await this._getDoc([PATH.agenda, hoy]);

    return {
      patient:    pac  || { name:'', age:'', diagnosis:'' },
      settings:   aj   || {},
      medications: meds,
      caregivers:  cuid,
      symptoms:    this._sortByDate(sint),
      rescues:     this._sortByDate(resc),
      history:     this._sortByDate(hist),
      agenda:      agendaDoc?.items || [],
      agendaDate:  agendaDoc?.date  || hoy,
    };
  }

  /* ---- Escrituras por entidad (documento a documento) ---- */
  savePatient(p){   return this._setDoc(PATH.paciente(), this._stamp(p)); }
  saveSettings(s){  return this._setDoc(PATH.ajustes(),  this._stamp(s)); }

  saveMedication(m){ return this._setDoc([PATH.medicamentos, m.id], this._stamp(m)); }
  async deleteMedication(id){
    await this._delPhoto(id).catch(() => {});           // borra la foto si existía
    return deleteDoc(doc(this.db, PATH.medicamentos, id));
  }

  saveCaregiver(c){  return this._setDoc([PATH.cuidadores, c.id], this._stamp(c)); }
  deleteCaregiver(id){ return deleteDoc(doc(this.db, PATH.cuidadores, id)); }

  addSymptom(x){  return this._setDoc([PATH.sintomas,  x.id], x); }
  addRescue(x){   return this._setDoc([PATH.rescates,  x.id], x); }
  addHistory(x){  return this._setDoc([PATH.historial, x.id], x); }
  deleteHistory(id){ return deleteDoc(doc(this.db, PATH.historial, id)); }

  saveAgenda(date, items){ return this._setDoc([PATH.agenda, date], { date, items }); }

  /* ---- Imágenes (Storage) -------------------------------- */
  /* Sube la foto del medicamento y devuelve su URL pública firmada. */
  async uploadMedPhoto(medId, file){
    const r = ref(this.storage, `medicamentos/${medId}/foto.jpg`);
    await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
    return getDownloadURL(r);
  }
  _delPhoto(medId){
    return deleteObject(ref(this.storage, `medicamentos/${medId}/foto.jpg`));
  }

  /* ---- Sincronización en vivo (opcional) ----------------- */
  /* Escucha una colección y llama cb con el array actualizado.
     Ideal para que un cambio en un dispositivo aparezca en el resto. */
  watchCollection(nombre, cb){
    const un = onSnapshot(collection(this.db, nombre),
      snap => cb(snap.docs.map(d => d.data())));
    this._unsubs.push(un);
    return un;
  }
  stopWatching(){ this._unsubs.forEach(u => u()); this._unsubs = []; }

  /* ---- Helpers internos ---------------------------------- */
  _stamp(obj){ return { ...obj, updatedAt: new Date().toISOString() }; }
  async _getDoc(path){
    const snap = await getDoc(doc(this.db, ...path));
    return snap.exists() ? snap.data() : null;
  }
  _setDoc(path, data){ return setDoc(doc(this.db, ...path), data, { merge:true }); }
  async _getCol(nombre){
    const snap = await getDocs(collection(this.db, nombre));
    return snap.docs.map(d => d.data());
  }
  _sortByDate(arr){ return arr.sort((a,b) => (b.date || '').localeCompare(a.date || '')); }
}

export const CuidaDB = new CuidaDBClass();
export { isoDate };
