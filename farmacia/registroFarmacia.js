import { auth, db } from '../firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registroFarmaciaForm');
  if (!form) {
    console.error("Formulario no encontrado.");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombreFarmacia = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const medicoResponsable = document.getElementById("medico").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    const colonia = document.getElementById("colonia").value.trim();
    const municipio = document.getElementById("municipio").value.trim();
    const estado = document.getElementById("estado").value.trim();
   

    if (!nombreFarmacia || !medicoResponsable || !correo || !telefono || !colonia || !municipio || !estado || !password) {
      alert("Por favor completa todos los campos.");
      return;
    }

    try {
      const credenciales = await createUserWithEmailAndPassword(auth, correo, password);
      const uid = credenciales.user.uid;

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

      alert("Registro enviado correctamente.");
      window.location.href = "/farmacia/espera_verificacion.html";
    } catch (error) {
      console.error("Error al registrar:", error);
      alert("Ocurrió un error al registrar la farmacia.");
    }
  });
});
