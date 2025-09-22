// /firebase-init.js — SDK 12.2.1 (robusto)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, setPersistence,
  indexedDBLocalPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ⚠️ Pon tus credenciales reales aquí
const firebaseConfig = {
  apiKey: "AIzaSy...tuKey...",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "es";

// Persistencia robusta (no bloqueante)
setPersistence(auth, indexedDBLocalPersistence)
  .catch(()=> setPersistence(auth, browserLocalPersistence))
  .catch(()=>{}); // última red

// Firestore con caché local persistente
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

console.log("[Firebase] SDK 12.2.1");

// ── Utilidad de emergencia: reseteo total de sesión Auth ──
window.kodrxAuthReset = async function(){
  try{ indexedDB.deleteDatabase('firebaseLocalStorageDb'); }catch(e){}
  try{
    Object.keys(localStorage).forEach(k=>{
      if (k.startsWith('firebase:authUser:') || k.startsWith('firebase:authPersistence:'))
        localStorage.removeItem(k);
    });
  }catch(e){}
  alert("Sesión local de Firebase borrada. Voy a recargar…");
  location.reload();
};
