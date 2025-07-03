// login.js
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.querySelector('input[placeholder="Correo electrónico"]');
  const passwordInput = document.querySelector('input[placeholder="Contraseña"]');
  const loginButton = document.querySelector('button');

  loginButton.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const medicoRef = doc(db, "medicos", uid);
      const medicoSnap = await getDoc(medicoRef);

      if (!medicoSnap.exists() || medicoSnap.data().verificado !== true) {
  alert("Tu cuenta aún no ha sido verificada. Por favor espera la aprobación del administrador.");
  window.location.href = "/medico/espera_verificacion.html";
  return;
}

      if (medicoSnap.exists()) {
        const data = medicoSnap.data();
        if (data.verificado === true) {
          window.location.href = "panel.html";
        } else {
          alert("Tu cuenta aún no ha sido verificada por el equipo de KodRx.");
        }
      } else {
        alert("No se encontró el perfil del médico en la base de datos.");
      }
    } catch (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  });
});
