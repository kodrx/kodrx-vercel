// /firebase-init.js — SDK 12.2.1 (robusto)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, setPersistence,
  indexedDBLocalPersistence, browserLocalPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  databaseURL: "https://kodrx-105b9-default-rtdb.firebaseio.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.appspot.com",
  messagingSenderId: "239675098141",
  appId: "1:239675098141:web:152ae3741b0ac79db7f2f4"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "es";

// 👇 Exponer para consola y otros módulos (necesario para el micro-servicio)
window.auth = auth;
// Promesa que resuelve cuando Firebase hidrata al usuario actual (evita 'auth undefined')
window.waitAuthUser = new Promise((resolve) => {
  onAuthStateChanged(auth, (u) => {
    window.currentUser = u;
    resolve(u);
  });
});

// Persistencia robusta (no bloqueante)
setPersistence(auth, indexedDBLocalPersistence)
  .catch(() => setPersistence(auth, browserLocalPersistence))
  .catch(() => {}); // última red

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

