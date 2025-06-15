// verificar.js
import { db } from './firebase-init.js';
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Obtener el ID desde la URL
const urlParams = new URLSearchParams(window.location.search);
const recetaId = urlParams.get("id");

const contenido = document.getElementById("contenido");

if (!recetaId) {
  contenido.innerHTML = "<p>Error: No se proporcionó ID de receta.</p>";
} else {
  const recetaRef = doc(db, "recetas", recetaId);
  getDoc(recetaRef).then((docSnap) => {
    if (!docSnap.exists()) {
      contenido.innerHTML = "<p>No se encontró la receta.</p>";
      return;
    }

    const data = docSnap.data();

    let html = `
      <div class="campo"><h4>Paciente:</h4> ${data.nombrePaciente}</div>
      <div class="campo"><h4>Edad:</h4> ${data.edad}</div>
      <div class="campo"><h4>Observaciones:</h4> ${data.observaciones || 'Ninguna'}</div>
      <div class="campo"><h4>Médico:</h4> ${data.medicoNombre || 'No disponible'}</div>
      <div class="campo"><h4>Medicamentos:</h4>
    `;

    data.medicamentos?.forEach((med) => {
      html += `<div class="medicamento">• ${med.nombre}, ${med.dosis}, ${med.duracion}</div>`;
    });

    html += "</div>";
    contenido.innerHTML = html;

  }).catch((error) => {
    console.error("Error al cargar receta:", error);
    contenido.innerHTML = `<p>Error al consultar la receta: ${error.message}</p>`;
  });
}
