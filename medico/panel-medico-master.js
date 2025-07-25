
// 🚀 Script maestro activo
import { db } from "/firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    const nombrePaciente = document.getElementById("nombrePaciente").value;
    const edad = document.getElementById("edad").value;
    const observaciones = document.getElementById("observaciones").value;

    const medicamentos = [];
    document.querySelectorAll(".medicamento").forEach(med => {
      const nombre = med.querySelector(".nombre").value;
      const dosis = med.querySelector(".dosis").value;
      const duracion = med.querySelector(".duracion").value;
      medicamentos.push({ nombre, dosis, duracion });
    });

    try {
      const recetaData = {
        nombrePaciente,
        edad,
        observaciones,
        medicamentos,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "recetas"), recetaData);
      console.log("✅ Receta guardada con ID:", docRef.id);

      const qrUrl = `/medico/ver-receta.html?id=${docRef.id}`;
      console.log("✅ QR generado para:", qrUrl);

      // Redirigir a la receta generada
      setTimeout(() => {
        window.location.href = qrUrl;
      }, 2000);

    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
    }
  });

  function agregarMedicamento() {
    const div = document.createElement("div");
    div.classList.add("medicamento");
    div.innerHTML = `
      <input type="text" class="nombre" placeholder="Nombre del medicamento">
      <input type="text" class="dosis" placeholder="Dosis">
      <input type="text" class="duracion" placeholder="Duración">
    `;
    medicamentosContainer.appendChild(div);
  }
});
