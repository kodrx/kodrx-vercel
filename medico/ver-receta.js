
import { db } from "/firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📄 Cargando receta...");

  const recetaId = getQueryParam("id");
  if (!recetaId) {
    alert("ID de receta no proporcionado.");
    return;
  }

  try {
    const docRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("Receta no encontrada.");
      return;
    }

    const data = docSnap.data();

    // Médicos
    document.getElementById("medicoNombre").textContent = "Dr. " + (data.medicoNombre || "No disponible");
    document.getElementById("medicoCedula").textContent = "Cédula: " + (data.medicoCedula || "No disponible");
    document.getElementById("medicoEspecialidad").textContent = data.medicoEspecialidad ? "Especialidad: " + data.medicoEspecialidad : "";

    // Paciente
    document.getElementById("datosPaciente").textContent = `${data.nombre} — Edad: ${data.edad || "N/D"}`;

    // Signos y observaciones
    document.getElementById("signosObservaciones").textContent = data.observaciones || "Sin observaciones registradas.";

    // Diagnóstico
    document.getElementById("diagnostico").textContent = data.diagnostico || "Sin diagnóstico.";

    // Tratamiento
    const lista = document.getElementById("listaMedicamentos");
    lista.innerHTML = "";
    if (Array.isArray(data.medicamentos)) {
      data.medicamentos.forEach((med) => {
        const li = document.createElement("li");
        li.textContent = `${med.nombre} — ${med.dosis}, ${med.duracion}`;
        lista.appendChild(li);
      });
    } else {
      lista.innerHTML = "<li>No hay medicamentos registrados.</li>";
    }

    // QR principal
    const qr = document.getElementById("qrReceta");
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://www.kodrx.app/public/verificar.html?id=${recetaId}`;

    // Blockchain
    document.getElementById("bloqueId").textContent = data.hash?.bloque || "No disponible";
    document.getElementById("hashValor").textContent = data.hash?.hash || "No disponible";

  } catch (error) {
    console.error("❌ Error al cargar la receta:", error);
    alert("Ocurrió un error al obtener la receta.");
  }
});
