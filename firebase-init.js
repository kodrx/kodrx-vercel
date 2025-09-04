
// /firebase-init.js

import {
  initializeApp,
  getApp,
  getApps,
  SDK_VERSION
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9"
};


const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db   = getFirestore(app);


console.log("[Firebase] SDK", SDK_VERSION);

