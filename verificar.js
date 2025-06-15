
import { db } from './firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const recetaId = urlParams.get('id');
const contenedor = document.getElementById('contenido');

async function cargarReceta() {
  try {
    const docRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      contenedor.innerHTML = "<p>Receta no encontrada.</p>";
      return;
    }

    const receta = docSnap.data();
    let html = `
      <div class="campo"><h4>Nombre del paciente:</h4> ${receta.nombrePaciente || ''}</div>
      <div class="campo"><h4>Edad:</h4> ${receta.edad || ''}</div>
      <div class="campo"><h4>Observaciones:</h4> ${receta.observaciones || 'Ninguna'}</div>
      <div class="campo"><h4>Médico responsable:</h4> ${receta.medicoNombre || 'Sin registrar'}</div>
      <div class="campo"><h4>Medicamentos:</h4>
    `;

    receta.medicamentos.forEach((med, index) => {
      let surtidoInfo = '';
      if (receta.surtidoParcial) {
        const match = receta.surtidoParcial.find(item =>
          item.nombre === med.nombre &&
          item.dosis === med.dosis &&
          item.duracion === med.duracion
        );
        if (match) {
          surtidoInfo = `
            <div class="medicamento">
              ✅ Surtido por: ${match.surtidoPor}<br>
              📞 Tel: ${match.telefono}
            </div>
          `;
        }
      }

      html += `
        <div class="medicamento">
          ${index + 1}. ${med.nombre}<br>
          Dosis: ${med.dosis}<br>
          Duración: ${med.duracion}
          ${surtidoInfo}
        </div>
      `;
    });

    html += "</div>";
    contenedor.innerHTML = html;
  } catch (error) {
    console.error("Error al cargar receta:", error);
    contenedor.innerHTML = "<p>Error al cargar la receta.</p>";
  }
}

cargarReceta();
