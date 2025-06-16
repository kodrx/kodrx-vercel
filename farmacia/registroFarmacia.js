import { auth, db } from '../firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#registroFarmaciaForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombreFarmacia = form.querySelector('input[placeholder="Nombre de la farmacia"]').value;
    const medicoResponsable = form.querySelector('input[placeholder="Médico responsable"]').value;
    const correo = form.querySelector('input[placeholder="Correo electrónico"]').value;
    const telefono = form.querySelector('input[placeholder="Teléfono"]').value;
    const colonia = form.querySelector('input[placeholder="Colonia"]').value;
    const municipio = form.querySelector('input[placeholder="Municipio"]').value;
    const estado = form.querySelector('input[placeholder="Estado"]').value;
    const password = form.querySelector('input[placeholder="Contraseña"]').value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "farmacias", uid), {
        nombreFarmacia,
        medicoResponsable,
        correo,
        telefono,
        colonia,
        municipio,
        estado,
        verificado: false,
        fechaRegistro: serverTimestamp()
      });

      window.location.href = "espera_verificacion.html";
    } catch (error) {
      alert("Error al registrar: " + error.message);
    }
  });
});
