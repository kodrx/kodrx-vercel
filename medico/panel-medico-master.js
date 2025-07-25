// 🚀 Script maestro activo
import { db, auth } from '/firebase-init.js';
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");
  const qrOutput = document.getElementById("qrOutput");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    const nombrePaciente = document.getElementById("nombrePaciente").value || "";
    const edad = document.getElementById("edad").value || "";
    const observaciones = document.getElementById("observaciones").value || "";

    const medicamentos = [];
    document.querySelectorAll(".medicamento").forEach(med => {
      const nombre = med.querySelector(".nombre").value || "";
      const dosis = med.querySelector(".dosis").value || "";
      const duracion = med.querySelector(".duracion").value || "";
      medicamentos.push({ nombre, dosis, duracion });
    });

    const correo = localStorage.getItem("kodrx_email") || "no-disponible";
    const receta = {
      nombrePaciente,
      edad,
      observaciones,
      medicamentos,
      correo,
      timestamp: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, "recetas"), receta);
      console.log("✅ Receta guardada con ID:", docRef.id);

      // Generar QR con enlace a ver-receta
      const qrURL = \`\${window.location.origin}/medico/ver-receta.html?id=\${docRef.id}\`;
      qrOutput.innerHTML = "";
      const img = document.createElement("img");
      img.src = \`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent(qrURL)}\`;
      img.alt = "QR KodRx";
      qrOutput.appendChild(img);
    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
    }
  });

  function agregarMedicamento() {
    const div = document.createElement("div");
    div.classList.add("medicamento");
    div.innerHTML = \`
      <input type="text" class="nombre" placeholder="Nombre del medicamento">
      <input type="text" class="dosis" placeholder="Dosis">
      <input type="text" class="duracion" placeholder="Duración">
    \`;
    medicamentosContainer.appendChild(div);
  }
});