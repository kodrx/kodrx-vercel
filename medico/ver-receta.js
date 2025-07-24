
console.log("📄 ver-receta.js activo");

import { db } from '/firebase-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const recetaId = urlParams.get("id");

  if (!recetaId) {
    document.body.innerHTML = "<h2>❌ ID de receta no especificado.</h2>";
    return;
  }

  try {
    const recetaRef = doc(db, "recetas", recetaId);
    const recetaSnap = await getDoc(recetaRef);

    if (!recetaSnap.exists()) {
      document.body.innerHTML = "<h2>❌ Receta no encontrada.</h2>";
      return;
    }

    const data = recetaSnap.data();
    document.getElementById("medico-nombre").textContent = data.medicoNombre || "No disponible";
    document.getElementById("medico-cedula").textContent = data.medicoCedula || "No disponible";
    document.getElementById("medico-especialidad").textContent = data.medicoEspecialidad || "No disponible";

    const domicilio = [data.medicoCalle, data.medicoNumero, data.medicoColonia, data.medicoMunicipio, data.medicoEstado, data.medicoCP]
      .filter(Boolean).join(", ");
    document.getElementById("medico-domicilio").textContent = domicilio || "No disponible";

    document.getElementById("paciente-nombre").textContent = data.nombrePaciente || "Sin nombre";
    document.getElementById("paciente-edad").textContent = data.edad || "Sin edad";
    document.getElementById("signos").textContent = data.observaciones || "No especificado";
    document.getElementById("diagnostico").textContent = data.diagnostico || "No disponible";

    const tratamientoLista = document.getElementById("tratamiento-lista");
    tratamientoLista.innerHTML = "";
    data.medicamentos?.forEach(med => {
      const li = document.createElement("li");
      li.textContent = `${med.nombre} — ${med.dosis} ${med.duracion}`;
      tratamientoLista.appendChild(li);
    });

    // QR para verificación pública
    const qrCanvas = document.getElementById("qr-canvas");
    await QRCode.toCanvas(qrCanvas, `${window.location.origin}/public/verificar.html?id=${recetaId}`, {
      width: 200,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
    });

    // Blockchain simulado
    document.getElementById("id-bloque").textContent = data.idBloque || "No disponible";
    document.getElementById("hash-bloque").textContent = data.hashBloque || "No disponible";

  } catch (error) {
    console.error("❌ Error al cargar receta:", error);
    document.body.innerHTML = "<h2>❌ Error al cargar la receta.</h2>";
  }
});
