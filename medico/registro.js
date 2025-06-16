
import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const form = document.getElementById('registroForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const especialidad = document.getElementById('especialidad').value.trim();
  const correo = document.getElementById('correo').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const cedula = document.getElementById('cedula').value.trim();
  const colonia = document.getElementById('colonia').value.trim();
  const estado = document.getElementById('estado').value.trim();
  const password = document.getElementById('password').value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
    const user = userCredential.user;

    await setDoc(doc(db, "medicos", user.uid), {
      nombre,
      especialidad,
      correo,
      telefono,
      cedula,
      colonia,
      estado,
      verificado: false,
      fechaRegistro: serverTimestamp()
    });

    alert("Registro exitoso. Espera la verificación de tu cuenta.");
    form.reset();
  } catch (error) {
    console.error("Error al registrar médico:", error);
    alert("Error al registrar: " + error.message);
  }
});
