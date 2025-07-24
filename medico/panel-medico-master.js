
console.log("🚀 Script maestro activo");

import { db, auth } from '/firebase-init.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  if (!form) {
    console.error("❌ No se encontró el formulario con id generarRecetaForm");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    const nombrePaciente = document.getElementById("nombrePaciente").value;
    const edad = document.getElementById("edad").value;
    const observaciones = document.getElementById("observaciones").value;
    const diagnostico = document.getElementById("diagnostico").value;

    // Datos del médico desde localStorage
    const medicoNombre = localStorage.getItem("kodrx_nombre") || "No disponible";
    const medicoCedula = localStorage.getItem("kodrx_cedula") || "No disponible";
    const medicoEspecialidad = localStorage.getItem("kodrx_especialidad") || "";
    const medicoEmail = localStorage.getItem("kodrx_email") || "";

    // Simulación de datos de blockchain
    const idBloque = localStorage.getItem("kodrx_bloque") || "0";
    const hashBloque = localStorage.getItem("kodrx_hash") || "N/A";

    // Captura medicamentos
    const medicamentos = [];
    document.querySelectorAll(".medicamento-item").forEach(item => {
      const nombre = item.querySelector(".nombre").value;
      const dosis = item.querySelector(".dosis").value;
      const duracion = item.querySelector(".duracion").value;
      if (nombre && dosis && duracion) {
        medicamentos.push({ nombre, dosis, duracion });
      }
    });

    try {
      const docRef = await addDoc(collection(db, "recetas"), {
        nombrePaciente,
        edad,
        observaciones,
        diagnostico,
        medicoNombre,
        medicoCedula,
        medicoEspecialidad,
        medicoEmail,
        idBloque,
        hashBloque,
        medicamentos,
        timestamp: serverTimestamp()
      });

      console.log("✅ Receta guardada con ID:", docRef.id);
      window.location.href = `/medico/ver-receta.html?id=${docRef.id}`;
    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
      alert("Hubo un error al guardar la receta.");
    }
  });
});
