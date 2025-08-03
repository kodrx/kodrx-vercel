
// 🧾 Script para mostrar receta KodRx (Versión sin módulos)
const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const params = new URLSearchParams(window.location.search);
const recetaId = params.get("id");

document.addEventListener("DOMContentLoaded", async () => {
  if (!recetaId) return;

  const docRef = db.collection("recetas").doc(recetaId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
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

  JsBarcode("#codigoBarrasPlano", recetaId, {
    format: "CODE128",
    lineColor: "#000",
    width: 1.8,
    height: 35,
    displayValue: true
  });
});

window.descargarPDF = async function () {
  const receta = document.querySelector('.receta');
  if (!receta) return alert("Receta no encontrada");

  document.body.classList.add('modo-compacto');
  receta.scrollIntoView({ behavior: "instant", block: "end" });
  await new Promise(resolve => setTimeout(resolve, 500));

  const opciones = {
    margin: 0.3,
    filename: 'receta-kodrx.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  await html2pdf().set(opciones).from(receta).save();
  document.body.classList.remove('modo-compacto');
};

window.descargarPDFUltraCompacto = async function () {
  const receta = document.querySelector('.receta');
  if (!receta) return alert("Receta no encontrada");

  document.body.classList.add('modo-ultra-compacto');
  receta.scrollIntoView({ behavior: "instant", block: "end" });
  await new Promise(resolve => setTimeout(resolve, 500));

  const opciones = {
    margin: 0.2,
    filename: 'receta-kodrx-ultra.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  await html2pdf().set(opciones).from(receta).save();
  document.body.classList.remove('modo-ultra-compacto');
};

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnDescargarPDF");
  if (btn) {
    btn.addEventListener("click", descargarPDF);
  }

  const btnUltra = document.getElementById("btnDescargarUltraPDF");
  if (btnUltra) {
    btnUltra.addEventListener("click", () => {
      console.log("📎 Botón ultra fue clicado");
      descargarPDFUltraCompacto();
    });
  }
});
