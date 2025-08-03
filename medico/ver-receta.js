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
  if (!recetaId) return;

  const docRef = doc(db, "recetas", recetaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    alert("Receta no encontrada");
    return;
  }

  function setText(id, texto) {
    const el = document.getElementById(id);
    if (!el) return;
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

  new QRCode(document.getElementById("qrReceta"), {
    text: `https://kodrx.app/verificar.html?id=${recetaId}`,
    width: 120,
    height: 120
  });

  new QRCode(document.getElementById("qrBlockchain"), {
    text: `https://kodrx-blockchain.onrender.com/verificar.html?id=${receta.bloque}`,
    width: 100,
    height: 100
  });
});

// 📥 Descargar PDF con ajuste para móviles
window.descargarPDF = async function () {
  const receta = document.querySelector('.receta');

  // Activar modo compacto visualmente
  document.body.classList.add('modo-compacto');

  // Forzar scroll al final para asegurar que todo el contenido esté visible
  receta.scrollIntoView({ behavior: "instant", block: "end" });

  // Esperar un pequeño delay para asegurar que el canvas capture todo
  await new Promise(resolve => setTimeout(resolve, 500));

  const opciones = {
    margin: 0.3,
    filename: 'receta-kodrx.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opciones).from(receta).save().then(() => {
    document.body.classList.remove('modo-compacto');
  });
};

// 📥 Descargar PDF Ultra Compacto
window.descargarPDFUltraCompacto = async function () {
  const receta = document.querySelector('.receta');
  document.body.classList.add('modo-ultra-compacto');
  receta.scrollIntoView({ behavior: "instant", block: "end" });

  await new Promise(resolve => setTimeout(resolve, 500));

  const opciones = {
    margin: 0.2,
    filename: 'receta-kodrx-ultra.pdf',
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opciones).from(receta).save().then(() => {
    document.body.classList.remove('modo-ultra-compacto');
  });
};
document.addEventListener("DOMContentLoaded", () => {
  const btnPDF = document.getElementById("btnDescargarPDF");
  const btnUltra = document.getElementById("btnDescargarUltraPDF");

  if (btnPDF) btnPDF.addEventListener("click", window.descargarPDF);
  if (btnUltra) btnUltra.addEventListener("click", window.descargarPDFUltraCompacto);
});
