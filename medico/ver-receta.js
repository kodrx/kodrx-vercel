
// 🧾 Script para mostrar receta KodRx

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Inicializar Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.appspot.com",
  messagingSenderId: "239675098141",
  appId: "1:239675098141:web:152ae3741b0ac79db7f2f4"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Obtener ID desde la URL
const params = new URLSearchParams(window.location.search);
const recetaId = params.get("id");

function mostrarTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto || "No disponible";
}

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
  mostrarTexto("medicoNombre", receta.medicoNombre || "Desconocido");
  mostrarTexto("medicoCedula", receta.medicoCedula || "Desconocida");
  mostrarTexto("medicoEspecialidad", receta.medicoEspecialidad || "General");
  mostrarTexto("medicoTelefono", receta.telefono || "No registrado");
  mostrarTexto("medicoDomicilio", receta.domicilio || "No registrado");

  // Datos del paciente
  mostrarTexto("nombrePaciente", receta.nombrePaciente || "Sin nombre");
  mostrarTexto("edad", receta.edad || "?");
  mostrarTexto("sexo", receta.sexo || "-");
  mostrarTexto("alergias", receta.alergias || "No registradas");
  mostrarTexto("talla", receta.talla || "-");
  mostrarTexto("peso", receta.peso || "-");
  mostrarTexto("imc", receta.imc || "-");
  mostrarTexto("temperatura", receta.temperatura || "-");
  mostrarTexto("presion", receta.presion || "-");

  // Datos clínicos
  mostrarTexto("diagnostico", receta.diagnostico || "Sin diagnóstico");
  mostrarTexto("observaciones", receta.observaciones || "No registrado");

  // Tratamiento
  const lista = document.getElementById("tratamientoLista");
  lista.innerHTML = "";
  if (receta.medicamentos && receta.medicamentos.length) {
    receta.medicamentos.forEach(med => {
      const li = document.createElement("li");
      li.textContent = `${med.nombre} — ${med.dosis}, ${med.duracion}`;
      lista.appendChild(li);
    });
  } else {
    lista.innerHTML = "<li>No se registraron medicamentos.</li>";
  }

  // QR receta
  const qrDiv = document.getElementById("qrReceta");
  new QRCode(qrDiv, `https://kodrx.app/public/verificar.html?id=${recetaId}`);

  // Blockchain
  mostrarTexto("bloqueId", receta.bloque || "No disponible");
  mostrarTexto("bloqueHash", receta.hash || "No disponible");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 Ver receta activo");
  cargarReceta();
});
