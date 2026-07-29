// Configuración pública de Firebase (se puede incrustar sin riesgo:
// la seguridad la dan Auth + las reglas, no estos valores).
//
// CÓMO OBTENERLA:
//   Consola de Firebase → icono ⚙️ (Configuración del proyecto) →
//   sección "Tus apps" → app web → "Configuración del SDK" → copia el objeto.
//
// Luego renombra este archivo a  firebase-config.js  y pega tus valores.

export const firebaseConfig = {
  apiKey:            "PEGA_AQUI",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  projectId:         "TU_PROYECTO",
  storageBucket:     "TU_PROYECTO.appspot.com",
  messagingSenderId: "PEGA_AQUI",
  appId:             "PEGA_AQUI"
};

// Firebase Console → App Check → tu app web → reCAPTCHA Enterprise.
// Es una clave pública; Google la limita a los dominios autorizados.
export const appCheckSiteKey = "PEGA_AQUI_LA_CLAVE_DE_SITIO_RECAPTCHA_ENTERPRISE";
