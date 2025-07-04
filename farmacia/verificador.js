import { db, auth } from '../firebase-init.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let datosFarmacia = null;
let recetaGlobal = null;
let recetaIdActual = null;

// Obtener datos de la farmacia logueada
onAuthStateChanged(auth, (user) => {
  if (user) {
    getDoc(doc(db, "farmacias", user.uid)).then((snap) => {
      if (snap.exists()) {
        datosFarmacia = snap.data();
      }
    });
  }
});

window.verificarManual = () => {
  const id = document.getElementById("inputID").value.trim();
  if (id) verificarReceta(id);
};

window.iniciarEscaneo = () => {
  const qrReader = new Html5Qrcode("qr-reader");
  qrReader.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      qrReader.stop();
      const id = new URL(decodedText).searchParams.get("id");
      if (id) verificarReceta(id);
    },
    () => {}
  );
};

async function verificarReceta(id) {
  const ref = doc(db, "recetas", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    document.getElementById("resultado").innerText = "Receta no encontrada.";
    return;
  }

  recetaIdActual = id;
  recetaGlobal = snap.data();
  const surtido = recetaGlobal.surtidoParcial || [];

  let html = `<h3>Paciente: ${recetaGlobal.nombrePaciente}</h3>`;
  html += `<p>Edad: ${recetaGlobal.edad}</p>`;
  html += `<p>Sexo: ${recetaGlobal.sexo || 'No registrado'}</p>`;
  html += `<p>Peso: ${recetaGlobal.peso || '-'} kg</p>`;
  html += `<p>Talla: ${recetaGlobal.talla ||
