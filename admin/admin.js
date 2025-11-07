// /admin/admin.js (LOGIN)
import { auth } from "../firebase-init.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const ADMIN_EMAIL = "admin@kodrx.app";

// Si ya está logueado y es admin, redirige de inmediato
onAuthStateChanged(auth, (u) => {
  if (u?.email === ADMIN_EMAIL) {
    sessionStorage.setItem("adminLoggedIn", "true");
    window.location.href = "/admin/admin.html";
  }
});

// Handler del formulario de login
const form = document.getElementById("adminLoginForm");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const error = document.getElementById("error");

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const u = cred.user;

      if (u.email === ADMIN_EMAIL) {
        sessionStorage.setItem("adminLoggedIn", "true");
        window.location.href = "/admin/admin.html";
      } else {
        // No admin: sal de sesión y muestra error
        await signOut(auth);
        error.textContent = "No tienes permisos de administrador.";
      }
    } catch (err) {
      // Credenciales no válidas
      const el = document.getElementById("error");
      if (el) el.textContent = "Correo o contraseña incorrectos.";
    }
  });
}

