
// verificar.js
import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const recetaId = urlParams.get('id');
const contenedor = document.getElementById('contenido');

async function cargarReceta() {
  try {
    const recetaRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(recetaRef);

    if (!docSnap.exists()) {
      contenedor.innerHTML = "<p>Receta no encontrada.</p>";
      return;
    }

    const receta = docSnap.data();
    let html = `
      <div><strong>Paciente:</strong> ${receta.nombrePaciente}</div>
      <div><strong>Edad:</strong> ${receta.edad}</div>
      <div><strong>Observaciones:</strong> ${receta.observaciones || 'Ninguna'}</div>
      <div><strong>Médico responsable:</strong> ${receta.medicoNombre || 'No registrado'}</div>
      <div><strong>Medicamentos:</strong></div>
    `;

    receta.medicamentos.forEach((med, index) => {
      let surtidoInfo = '';
      const surtidos = receta.surtidoParcial || [];
      const match = surtidos.find(item =>
        item.nombre === med.nombre &&
        item.dosis === med.dosis &&
        item.duracion === med.duracion
      );

      if (match) {
        const fechaLocal = new Date(match.fecha).toLocaleString('es-MX');
        surtidoInfo = `
          <div style="margin-left: 15px;">
            ✅ Surtido por: ${match.surtidoPor}<br>
            📞 Tel: ${match.telefono}<br>
            🕒 Fecha de surtido: ${fechaLocal}
          </div>`;
      }

      html += `
        <div style="margin-left: 10px;">
          ${index + 1}. ${med.nombre} - ${med.dosis} - ${med.duracion}
          ${surtidoInfo}
        </div>
      `;
    });

    contenedor.innerHTML = html;
  } catch (error) {
    console.error("Error al cargar receta:", error);
    contenedor.innerHTML = "<p>Error al cargar la receta médica.</p>";
  }
}

cargarReceta();
