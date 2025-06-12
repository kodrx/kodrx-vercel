// registro.js
import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = form.querySelector('input[placeholder="Nombre completo"]').value;
    const especialidad = form.querySelector('input[placeholder="Especialidad (opcional)"]').value;
    const correo = form.querySelector('input[placeholder="Correo electrónico"]').value;
    const telefono = form.querySelector('input[placeholder="Teléfono celular"]').value;
    const cedula = form.querySelector('input[placeholder="Cédula profesional"]').value;
    const colonia = form.querySelector('input[placeholder="Colonia de residencia"]').value;
    const password = form.querySelector('input[placeholder="Contraseña"]').value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "medicos", uid), {
        nombre,
        especialidad,
        correo,
        telefono,
        cedula,
        colonia,
        verificado: false
      });

      window.location.href = "espera_verificacion.html";
    } catch (error) {
      alert("Error al registrar: " + error.message);
    }
  });
});
