// 🧾 Script para mostrar receta KodRx
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import QRCode from "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

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

const recetaId = new URLSearchParams(window.location.search).get("id");

function mostrar(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto || "No disponible";
}

async function cargarReceta() {
  if (!recetaId) return;

  const docRef = doc(db, "recetas", recetaId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return alert("Receta no encontrada");

  const r = docSnap.data();

  // Médico
  mostrar("medicoNombre", r.medicoNombre);
  mostrar("medicoCedula", r.medicoCedula);
  mostrar("medicoEspecialidad", r.medicoEspecialidad);
  mostrar("medicoDomicilio", r.medicoDomicilio);
  mostrar("medicoTelefono", r.medicoTelefono);

  // Paciente
  mostrar("pacienteNombre", r.nombrePaciente);
  mostrar("pacienteEdad", r.edad);
  mostrar("sexo", r.sexo);
  mostrar("alergias", r.alergias);
  mostrar("talla", r.talla);
  mostrar("peso", r.peso);
  mostrar("imc", r.imc);
  mostrar("temperatura", r.temperatura);
  mostrar("presion", r.presion);

  // Clínico
  mostrar("diagnostico", r.diagnostico);
  mostrar("observaciones", r.observaciones);

  // Medicamentos
  const ul = document.getElementById("tratamientoLista");
  ul.innerHTML = "";
  if (Array.isArray(r.medicamentos)) {
    r.medicamentos.forEach(m => {
      const li = document.createElement("li");
      li.textContent = `${m.nombre} — ${m.dosis} — ${m.duracion}`;
      ul.appendChild(li);
    });
  } else {
    ul.innerHTML = "<li>No se registraron medicamentos.</li>";
  }

  // QR pública
  QRCode.toCanvas(document.getElementById("qrReceta"), `https://kodrx.app/public/verificar.html?id=${recetaId}`, { width: 128 });

  // QR blockchain
  QRCode.toCanvas(document.getElementById("qrBlockchain"), `https://kodrx-blockchain.onrender.com/public/consulta.html?id=${recetaId}`, { width: 128 });

  // Blockchain
  mostrar("bloqueId", r.bloque);
  mostrar("bloqueHash", r.hash);
}

document.addEventListener("DOMContentLoaded", cargarReceta);
