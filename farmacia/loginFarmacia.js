// loginFarmacia.js
import { auth, db } from '../firebase-init.js';
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

      const docRef = doc(db, "farmacias", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.verificado === true) {
          window.location.href = "verificador.html";
        } else {
          alert("Tu cuenta aún no ha sido verificada por el equipo de KodRx.");
        }
      } else {
        alert("No se encontró el perfil de la farmacia.");
      }
    } catch (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  });
});
