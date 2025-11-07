// /admin/firebase-init-admin.js
// Wrapper para ADMIN: reaprovecha tu init global y expone helpers solo en páginas admin

import { app, auth, db } from "../firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Expón en global para consola / scripts del panel admin
window.app = app;
window.auth = auth;

// Promesa que resuelve cuando Firebase hidrata al usuario en esta pestaña
window.waitAuthUser = new Promise((resolve) => {
  onAuthStateChanged(auth, (u) => {
    window.currentUser = u;
    resolve(u);
  });
});

export { app, auth, db };
