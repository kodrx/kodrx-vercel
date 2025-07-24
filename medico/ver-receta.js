
console.log("📄 Script de visualización de receta activo");

import { db } from '/firebase-init.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const recetaId = params.get("id");

  if (!recetaId) {
    alert("❌ No se proporcionó ID de receta.");
    return;
  }

  try {
    const recetaRef = doc(db, "recetas", recetaId);
    const recetaSnap = await getDoc(recetaRef);

    if (!recetaSnap.exists()) {
      alert("❌ La receta no existe.");
      return;
    }

    const data = recetaSnap.data();

    document.getElementById("medico-info").textContent =
      `Dr. ${data.medicoNombre} — Cédula: ${data.medicoCedula}` +
      (data.medicoEspecialidad ? ` — Especialidad: ${data.medicoEspecialidad}` : "");

    document.getElementById("paciente-info").textContent =
      `${data.nombrePaciente}, ${data.edad} años`;

    document.getElementById("observaciones").textContent = data.observaciones || "N/A";
    document.getElementById("diagnostico").textContent = data.diagnostico || "N/A";

    const lista = document.getElementById("medicamentos");
    lista.innerHTML = "";
    (data.medicamentos || []).forEach(med => {
      const li = document.createElement("li");
      li.textContent = `${med.nombre} — ${med.dosis} — ${med.duracion}`;
      lista.appendChild(li);
    });

    document.getElementById("bloque-id").textContent = `ID de Bloque: ${data.idBloque || "N/A"}`;
    document.getElementById("bloque-hash").textContent = `Hash de Bloque: ${data.hashBloque || "N/A"}`;

    const qrDiv = document.getElementById("qrContainer");
    if (qrDiv) {
      const qrURL = `https://kodrx.app/public/verificar.html?id=${recetaId}`;
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
      script.onload = () => {
        QRCode.toDataURL(qrURL, { width: 220 }, (err, url) => {
          if (!err) {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "QR KodRx";
            qrDiv.innerHTML = "";
            qrDiv.appendChild(img);
          }
        });
      };
      document.body.appendChild(script);
    }

  } catch (error) {
    console.error("❌ Error al cargar receta:", error);
    alert("Hubo un error al cargar la receta.");
  }
});
