
// 🧾 Script para mostrar receta KodRx
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";

// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD-...",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcd1234"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Obtener ID desde la URL
const params = new URLSearchParams(window.location.search);
const recetaId = params.get("id");

const mostrarTexto = (id, texto) => {
  document.getElementById(id).textContent = texto || "No disponible";
};

async function cargarReceta() {
  if (!recetaId) return;

  const docRef = doc(db, "recetas", recetaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Receta no encontrada");
    return;
  }

  const receta = docSnap.data();

  // Datos del médico
  mostrarTexto("medicoNombre", "Dr. " + (receta.medicoNombre || "No disponible"));
  mostrarTexto("medicoCedula", receta.medicoCedula);
  mostrarTexto("medicoEspecialidad", receta.medicoEspecialidad || "General");

  // Datos del paciente
  mostrarTexto("pacienteNombreEdad", \`\${receta.nombrePaciente || "Sin nombre"} — Edad: \${receta.edad || "?"}\`);

  // Datos clínicos
  mostrarTexto("signosObservaciones", receta.observaciones || "No registrado");
  mostrarTexto("diagnostico", receta.diagnostico || "Sin diagnóstico");

  // Tratamiento
  const tratamiento = document.getElementById("tratamientoLista");
  tratamiento.innerHTML = "";
  if (receta.medicamentos && receta.medicamentos.length) {
    receta.medicamentos.forEach(med => {
      const li = document.createElement("li");
      li.textContent = \`\${med.nombre} — \${med.dosis}, \${med.duracion}\`;
      tratamiento.appendChild(li);
    });
  } else {
    tratamiento.innerHTML = "<li>No se registraron medicamentos.</li>";
  }

  // QR
  const qrDiv = document.getElementById("qrReceta");
  QRCode.toCanvas(qrDiv, \`https://kodrx.app/public/verificar.html?id=\${recetaId}\`, { width: 150 }, function (error) {
    if (error) console.error(error);
  });

  // Bloque
  mostrarTexto("bloqueId", receta.bloque || "No disponible");
  mostrarTexto("bloqueHash", receta.hash || "No disponible");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 Ver receta activo");
  cargarReceta();
});
