// 🧾 Script para mostrar receta KodRx
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const recetaId = params.get("id");

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📄 Ver receta activo");
  if (!recetaId) return;

  const docRef = doc(db, "recetas", recetaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Receta no encontrada");
    return;
  }
function setText(id, texto) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`❌ Elemento con id="${id}" no encontrado en el HTML`);
    return;
  }
  el.textContent = texto || "—";
}

  const receta = docSnap.data();


  setText("medicoNombre", `Dr. ${receta.medicoNombre}`);
  setText("medicoCedula", receta.medicoCedula);
  setText("medicoEspecialidad", receta.medicoEspecialidad);
  setText("medicoTelefono", receta.medicoTelefono);
  setText("medicoDomicilio", receta.medicoDomicilio);
  setText("nombrePaciente", receta.nombrePaciente);
  setText("edad", receta.edad);
  setText("sexo", receta.sexo);
  setText("peso", receta.peso);
  setText("talla", receta.talla);
  setText("imc", receta.imc);
  setText("presion", receta.presion);
  setText("temperatura", receta.temperatura);
  setText("observaciones", receta.observaciones);
  setText("diagnostico", receta.diagnostico);
  setText("bloque", receta.bloque);
  setText("hash", receta.hash);

  const tratamientoLista = document.getElementById("tratamientoLista");
  tratamientoLista.innerHTML = "";
  receta.medicamentos.forEach(med => {
    const li = document.createElement("li");
    li.textContent = `${med.nombre} — ${med.dosis} — ${med.duracion}`;
    tratamientoLista.appendChild(li);
  });
const qr1 = document.getElementById("qrReceta");
const qr2 = document.getElementById("qrBlockchain");

if (qr1) {
  new QRCode(qr1, {
    text: `https://kodrx.app/verificar.html?id=${recetaId}`,
    width: 120,
    height: 120
  });
}

if (qr2) {
  new QRCode(qr2, {
    text: `https://kodrx.app/public/consulta.html?id=${recetaId}`,
    width: 100,
    height: 100
  });
}

  // QRs
  new QRCode(document.getElementById("qrReceta"), {
    text: `https://kodrx.app/verificar.html?id=${recetaId}`,
    width: 120,
    height: 120
  });
  new QRCode(document.getElementById("qrBlockchain"), {
    text: `https://kodrx.app/public/consulta.html?id=${recetaId}`,
    width: 100,
    height: 100
  });
});
