
// login.js actualizado
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

      if (medicoSnap.exists()) {
        const data = medicoSnap.data();

        if (data.suspendido) {
          return window.location.href = "/suspendido.html";
        }

        if (data.verificado === true) {
          localStorage.setItem('kodrx_email', email); 
          console.log("✅ Guardado en localStorage:", localStorage.getItem('kodrx_email'));
          window.location.href = "panel.html";
        } else {
          alert("Tu cuenta aún no ha sido verificada.");
        }
      } else {
        alert("No se encontró al médico en la base de datos.");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      alert("Correo o contraseña incorrectos.");
    }
  });
});
