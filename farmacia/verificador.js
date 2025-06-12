// verificador.js
import { db, auth } from '../firebase-init.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let datosFarmacia = null;

// Obtener datos de la farmacia autenticada
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "farmacias", user.uid));
    if (snap.exists()) {
      datosFarmacia = snap.data();
    }
  }
});

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

    data.medicamentos.forEach((med, i) => {
      const id = `med-${i}`;
      const yaSurtido = (data.surtidoParcial || []).find(m => m.nombre === med.nombre);
      html += `<div class="medicamento">
        <input type="checkbox" id="${id}" ${yaSurtido ? 'disabled checked' : ''}>
        <label for="${id}">${med.nombre}, ${med.dosis}, ${med.duracion}
        ${yaSurtido ? `(Surtido por ${yaSurtido.surtidoPor}, Tel: ${yaSurtido.telefono})` : ''}
        </label>
      </div>`;
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
  const recetaRef = doc(db, "recetas", id);

  try {
    const docSnap = await getDoc(recetaRef);
    const receta = docSnap.data();
    let medicamentosMarcados = [];

    receta.medicamentos.forEach((med, i) => {
      const checkbox = document.getElementById(`med-${i}`);
      if (checkbox && checkbox.checked && !checkbox.disabled) {
        medicamentosMarcados.push({
          nombre: med.nombre,
          dosis: med.dosis,
          duracion: med.duracion,
          surtidoPor: datosFarmacia?.nombreFarmacia || 'Farmacia desconocida',
          telefono: datosFarmacia?.telefono || 'Sin teléfono'
        });
      }
    });

    if (estado === "parcial" && medicamentosMarcados.length === 0) {
      alert("Selecciona al menos un medicamento para marcar como surtido parcialmente.");
      return;
    }

    const totalSurtidos = (receta.surtidoParcial || []).concat(medicamentosMarcados);
    const yaTodos = totalSurtidos.length === receta.medicamentos.length;

    const actualiza = {
      surtidoParcial: totalSurtidos
    };

    if (estado === "surtida" || yaTodos) {
      actualiza.estado = "surtida";
      actualiza.surtidoPor = datosFarmacia?.nombreFarmacia || "Farmacia desconocida";
      actualiza.telefonoFarmacia = datosFarmacia?.telefono || "Sin teléfono";
    } else {
      actualiza.estado = "parcial";
    }

    await updateDoc(recetaRef, actualiza);

    alert("Receta actualizada correctamente.");
    consultarReceta();
  } catch (err) {
    alert("Error al actualizar estado: " + err.message);
  }
};
// Función para escanear QR desde navegador
window.iniciarEscaneo = () => {
  const reader = document.getElementById("reader");
  reader.style.display = "block";

  const html5QrCode = new Html5Qrcode("reader");
  const config = { fps: 10, qrbox: 250 };

  html5QrCode.start(
    { facingMode: "environment" },
    config,
    (decodedText) => {
      html5QrCode.stop().then(() => {
        reader.style.display = "none";
        document.getElementById("input-id").value = decodedText.split("id=")[1] || decodedText;
        consultarReceta();
      });
    },
    (errorMessage) => {
      // Errores ignorados
    }
  ).catch((err) => {
    alert("No se pudo acceder a la cámara: " + err);
    reader.style.display = "none";
  });
};
