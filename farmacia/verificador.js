// verificador.js
import { db } from '../firebase-init.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

window.consultarReceta = async () => {
  const id = document.getElementById("input-id").value.trim();
  const contenido = document.getElementById("contenido");
  const botones = document.getElementById("botones-estado");

  if (!id) {
    alert("Por favor ingresa un ID de receta.");
    return;
  }

  try {
    const recetaRef = doc(db, "recetas", id);
    const docSnap = await getDoc(recetaRef);

    if (!docSnap.exists()) {
      contenido.innerHTML = "<p>No se encontró la receta.</p>";
      botones.style.display = "none";
      return;
    }

    const data = docSnap.data();
    let html = `
      <div class="campo"><h4>Paciente:</h4> ${data.nombrePaciente}</div>
      <div class="campo"><h4>Edad:</h4> ${data.edad}</div>
      <div class="campo"><h4>Observaciones:</h4> ${data.observaciones || 'Ninguna'}</div>
      <div class="campo"><h4>Medicamentos:</h4>
    `;

    data.medicamentos.forEach(med => {
      html += `<div class="medicamento">• ${med.nombre}, ${med.dosis}, ${med.duracion}</div>`;
    });

    html += "</div>";

    if (data.estado) {
      html += `<div class="campo"><h4>Estado:</h4> ${data.estado}</div>`;
    }

    contenido.innerHTML = html;
    botones.style.display = "block";
    botones.setAttribute("data-id", id);

  } catch (err) {
    contenido.innerHTML = `<p>Error al consultar la receta: ${err.message}</p>`;
    botones.style.display = "none";
  }
};

window.actualizarEstado = async (estado) => {
  const botones = document.getElementById("botones-estado");
  const id = botones.getAttribute("data-id");
  if (!id) return;

  try {
    const recetaRef = doc(db, "recetas", id);
    await updateDoc(recetaRef, { estado });

    alert("Estado actualizado a: " + estado);
    consultarReceta(); // volver a cargar
  } catch (err) {
    alert("Error al actualizar estado: " + err.message);
  }
};
