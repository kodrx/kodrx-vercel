// 🚀 Script maestro activo para panel médico
import { db, auth } from "/firebase-init.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    try {
      // Datos del paciente
      const nombrePaciente = document.getElementById("nombrePaciente").value;
      const edad = document.getElementById("edad").value;
      const observaciones = document.getElementById("observaciones").value;
      const diagnostico = document.getElementById("diagnostico")?.value || "";

      // Datos clínicos
      const peso = document.getElementById("peso")?.value || "";
      const talla = document.getElementById("talla")?.value || "";
      const imc = document.getElementById("imc")?.value || "";
      const presion = document.getElementById("presion")?.value || "";
      const temperatura = document.getElementById("temperatura")?.value || "";
      const sexo = document.getElementById("sexo")?.value || "";

      // Datos del médico
      const medicoNombre = localStorage.getItem("medicoNombre") || "Desconocido";
      const medicoCedula = localStorage.getItem("medicoCedula") || "Desconocida";
      const medicoEspecialidad = localStorage.getItem("medicoEspecialidad") || "General";

      // Tratamiento
      const medicamentos = [];
      document.querySelectorAll(".medicamento").forEach(med => {
        const nombre = med.querySelector(".nombre").value;
        const dosis = med.querySelector(".dosis").value;
        const duracion = med.querySelector(".duracion").value;
        medicamentos.push({ nombre, dosis, duracion });
      });

      // Bloque simulado
      const bloque = Math.floor(Math.random() * 100000);
      const hash = self.crypto?.randomUUID?.() || `HASH-${Date.now()}`;

      // Obtener correo del usuario
      const user = auth.currentUser;
      const correo = user?.email || "";

      // Enviar a Firestore
      const docRef = await addDoc(collection(db, "recetas"), {
        nombrePaciente,
        edad,
        observaciones,
        diagnostico,
        peso,
        talla,
        imc,
        presion,
        temperatura,
        sexo,
        medicoNombre,
        medicoCedula,
        medicoEspecialidad,
        medicamentos,
        bloque,
        hash,
        correo,
        timestamp: Timestamp.now()
      });

      console.log("✅ Receta guardada con ID:", docRef.id);

      const qrUrl = `/medico/ver-receta.html?id=${docRef.id}`;
      const qrContainer = document.getElementById("qrContainer");
      qrContainer.innerHTML = "";
      new QRCode(qrContainer, {
        text: qrUrl,
        width: 128,
        height: 128
      });
      console.log("✅ QR generado para:", qrUrl);

      // Redirigir tras 3s
      setTimeout(() => {
        window.location.href = qrUrl;
      }, 3000);

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
    \`;
    medicamentosContainer.appendChild(div);
  }
});
