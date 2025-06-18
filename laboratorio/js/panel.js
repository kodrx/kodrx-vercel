import { auth } from "/firebase-init.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const contenido = document.getElementById("contenido");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/laboratorio/login.html";
  }
});

// Navegación
document.getElementById("btn-verificador").onclick = () => {
  contenido.innerHTML = "<h3>📥 Recetas Recibidas</h3><p>Aquí irá el verificador QR.</p>";
};

document.getElementById("btn-historial").onclick = () => {
  contenido.innerHTML = "<h3>📊 Historial</h3><p>Aquí se mostrarán las recetas gestionadas.</p>";
};

document.getElementById("btn-configuracion").onclick = () => {
  contenido.innerHTML = "<h3>⚙️ Configuración</h3><p>Opciones de cuenta del laboratorio.</p>";
};

document.getElementById("btn-salir").onclick = () => {
  signOut(auth).then(() => {
    window.location.href = "/laboratorio/login.html";
  });
};
