
// panel-medico-master.js
console.log("🚀 Script maestro activo");

import { db } from '/firebase-init.js';

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.getElementById("generarRecetaForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const nombrePaciente = document.getElementById("nombre").value;
      const edad = document.getElementById("edad").value;
      const sexo = document.getElementById("sexo").value;
      const peso = document.getElementById("peso").value;
      const talla = document.getElementById("talla").value;
      const temperatura = document.getElementById("temperatura").value;
      const presion = document.getElementById("presion").value;
      const observaciones = document.getElementById("observaciones").value;
      const diagnostico = document.getElementById("diagnostico").value;

      const correo = localStorage.getItem("kodrx_email") || "";
      const timestamp = new Date();

      if (!correo) {
        alert("Sesión inválida. Inicia sesión nuevamente.");
        return;
      }

      const imc = calcularIMC(peso, talla);
      const medicamentos = obtenerMedicamentos();

      const receta = {
        nombrePaciente,
        edad,
        sexo,
        peso,
        talla,
        imc,
        temperatura,
        presion,
        observaciones,
        diagnostico,
        medicamentos,
        correo,
        timestamp
      };

      import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const recetasRef = collection(db, "recetas");
const docRef = await addDoc(recetasRef, receta);

      console.log("✅ Receta guardada con ID:", docRef.id);
      window.location.href = `/medico/ver-receta.html?id=${docRef.id}`;
    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
      alert("Error al guardar la receta.");
    }
  });

  function calcularIMC(peso, talla) {
    const p = parseFloat(peso);
    const t = parseFloat(talla) / 100;
    if (isNaN(p) || isNaN(t) || t <= 0) return "";
    return (p / (t * t)).toFixed(2);
  }

  function obtenerMedicamentos() {
    const lista = [];
    document.querySelectorAll(".medicamento").forEach((med) => {
      const nombre = med.querySelector(".nombre")?.value || "";
      const dosis = med.querySelector(".dosis")?.value || "";
      const duracion = med.querySelector(".duracion")?.value || "";
      if (nombre && dosis && duracion) {
        lista.push({ nombre, dosis, duracion });
      }
    });
    return lista;
  }
});
