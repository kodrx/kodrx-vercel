import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRegistro");

  if (!btn) {
    console.error("No se encontró el botón con ID 'btnRegistro'");
    return;
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const campos = ["nombre", "especialidad", "correo", "telefono", "cedula", "colonia", "estado", "password"];
    const datos = {};

    for (const campo of campos) {
      const input = document.getElementById(campo);
      if (!input) {
        alert(`Falta el campo '${campo}' en el formulario`);
        return;
      }
      datos[campo] = input.value.trim();
    }

    const { nombre, especialidad, correo, telefono, cedula, colonia, estado, password } = datos;

    if (Object.values(datos).some(v => !v)) {
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
      window.location.href = "/medico/espera_verificacion.html";
    } catch (error) {
      console.error("Error al registrar médico:", error.code, error.message);
      alert("Ocurrió un error al registrar el médico. Revisa los datos o intenta más tarde.");
    }
  });
});

