
import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

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

      console.log(" UID del usuario autenticado:", uid);

      const medicoRef = doc(db, "medicos", uid);
      const medicoSnap = await getDoc(medicoRef);

      if (medicoSnap.exists()) {
        const data = medicoSnap.data();
        console.log(" Documento del médico:", data);

        if (data.suspendido) {
          console.log("⛔ Cuenta suspendida");
          return window.location.href = "/suspendido.html";
        }

        if (data.verificado === true) {
          localStorage.setItem('kodrx_email', email);
          console.log(" Guardado en localStorage:", localStorage.getItem('kodrx_email'));
          window.location.href = "panel.html";
        } else {
          alert("Tu cuenta aún no ha sido verificada.");
        }
      } else {
        alert("No se encontró al médico en la base de datos.");
        console.log(" Documento no encontrado en colección 'medicos'. UID:", uid);
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("Correo o contraseña incorrectos.");
    }
  });
});
