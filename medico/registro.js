// registro.js
import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
  const btnRegistro = document.getElementById("btnRegistro");

  if (!btnRegistro) {
    console.error("No se encontró el botón #btnRegistro");
    return;
  }

  btnRegistro.addEventListener("click", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const especialidad = document.getElementById("especialidad").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    const telefono = document.getElementById("telefono").value.trim();
    const cedula = document.getElementById("cedula").value.trim();
    const colonia = document.getElementById("colonia").value.trim();
    const estado = document.getElementById("estado").value.trim();

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
        estado,
        verificado: false,
        fechaRegistro: serverTimestamp()
      });

      alert("Registro enviado correctamente. Espera verificación.");
      window.location.href = "/public/espera_verificacion.html";
    } catch (error) {
      console.error("Error en el registro:", error);
      alert("Error al registrar: " + error.message);
    }
  });
});
