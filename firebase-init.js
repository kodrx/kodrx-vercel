
// firebase-init.js universal para KodRx

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Configuración única del proyecto KodRx
const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  databaseURL: "https://kodrx-105b9-default-rtdb.firebaseio.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.firebasestorage.app",
  messagingSenderId: "239675098141",
  appId: "1:239675098141:web:152ae3741b0ac79db7f2f4"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Exponer todo lo necesario desde un solo lugar
export { app, auth, db, signOut, onAuthStateChanged };
