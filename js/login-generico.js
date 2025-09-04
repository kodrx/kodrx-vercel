import { auth } from "/firebase-init.js";
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Detecta el módulo automáticamente por la ruta
const ruta = window.location.pathname;
let destino = "/";

if (ruta.includes("/medico/")) destino = "/medico/panel.html";
else if (ruta.includes("/farmacia/")) destino = "/farmacia/panel.html";
else if (ruta.includes("/laboratorio/")) destino = "/laboratorio/panel.html";

document.querySelector(".form-login").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.querySelector('input[type="email"]').value.trim();
  const password = document.querySelector('input[type="password"]').value;

  try {
  await signInWithEmailAndPassword(auth, email, password);
  localStorage.setItem("kodrx_email", email); // ✅ Guardamos sesión local para historial
  window.location.href = destino;
} catch (error) {
  alert("Error al iniciar sesión: " + error.message);
}

});
