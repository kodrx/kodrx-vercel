
import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRegistro");
  if (!btn) {
    console.error("No se encontró el botón #btnRegistro");
    return;
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre").value.trim();
    const especialidad = document.getElementById("especialidad").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const cedula = document.getElementById("cedula").value.trim();
    const colonia = document.getElementById("colonia").value.trim();
    const estado = document.getElementById("estado").value.trim();
    const password = document.getElementById("password").value;

    if (!nombre || !correo || !telefono || !cedula || !colonia || !estado || !password) {
      alert("Por favor completa todos los campos.");
      return;
    }

    try {
      const credenciales = await createUserWithEmailAndPassword(auth, correo, password);
      const uid = credenciales.user.uid;

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

      alert("Registro enviado correctamente.");
      window.location.href = "/public/registro_exito.html";
    } catch (error) {
      console.error("Error al registrar:", error);
      alert("Ocurrió un error al registrar el médico.");
    }
  });
});
