
// 🚀 Script maestro activo
import { db } from '/firebase-init.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");
  const qrContainer = document.getElementById("qrContainer");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    try {
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

      const medicoEmail = localStorage.getItem("kodrx_email") || "desconocido";

      const receta = {
        nombrePaciente,
        edad,
        observaciones,
        medicamentos,
        medicoEmail,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "recetas"), receta);
      console.log("✅ Receta guardada con ID:", docRef.id);

      const qrUrl = `/medico/ver-receta.html?id=${docRef.id}`;
      console.log("✅ QR generado para:", qrUrl);

      qrContainer.innerHTML = "";
      new QRCode(qrContainer, {
        text: qrUrl,
        width: 128,
        height: 128
      });

      setTimeout(() => {
        window.location.href = qrUrl;
      }, 1500);

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
