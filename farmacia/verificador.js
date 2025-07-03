import { db, auth } from '../firebase-init.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let datosFarmacia = null;
let recetaGlobal = null;
let recetaIdActual = null;

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
  html += `<p>Talla: ${recetaGlobal.talla || '-'} cm</p>`;
  html += `<p>IMC: ${recetaGlobal.imc || '-'}</p>`;
  html += `<p>Presión arterial: ${recetaGlobal.presion || '-'}</p>`;
  html += `<p>Temperatura: ${recetaGlobal.temperatura || '-'}</p>`;
  html += `<p><strong>Diagnóstico:</strong> ${recetaGlobal.diagnostico || '-'}</p>`;
  html += `<p><strong>Fecha:</strong> ${recetaGlobal.timestamp?.toDate().toLocaleString() || '-'}</p>`;
  html += `<p><strong>Médico:</strong> ${recetaGlobal.medicoNombre || 'Desconocido'}</p>`;
  html += `<p><strong>Cédula del médico:</strong> ${recetaGlobal.medicoCedula || '-'}</p>`;
  html += `<p><strong>Especialidad:</strong> ${recetaGlobal.medicoEspecialidad || '-'}</p>`;
const direccion = `${recetaGlobal.medicoCalle || ''} ${recetaGlobal.medicoNumero || ''}, Col. ${recetaGlobal.medicoColonia || ''}, ${recetaGlobal.medicoMunicipio || ''}, ${recetaGlobal.medicoEstado || ''}, C.P. ${recetaGlobal.medicoCP || ''}`;
html += `<p><strong>Domicilio del consultorio:</strong> ${direccion}</p>`;


  html += `<h4>Medicamentos:</h4>`;
  recetaGlobal.medicamentos.forEach((med, idx) => {
    const ya = surtido.find(s => s.nombre === med.nombre);
    const disable = ya ? "checked disabled" : "";
    const extra = ya ? `<span class="surtido-info">Surtido por: ${ya.surtidoPor}, Tel: ${ya.telefono}</span>` : "";
    html += `<div class="medicamento"><label><input type="checkbox" data-index="${idx}" ${disable}> ${med.nombre} - ${med.dosis}, ${med.duracion}</label> ${extra}</div>`;
  });

  html += `<br><button onclick="surtirReceta()">Surtir</button>`;
  document.getElementById("resultado").innerHTML = html;
}

window.surtirReceta = async () => {
  if (!recetaGlobal || !recetaIdActual || !datosFarmacia) return alert("Faltan datos para surtir.");

  const checks = document.querySelectorAll('input[type="checkbox"]:not(:disabled):checked');
  const seleccionados = Array.from(checks).map(c => recetaGlobal.medicamentos[c.dataset.index]);

  if (seleccionados.length === 0) return alert("Selecciona al menos un medicamento.");

  const nuevos = seleccionados.map(m => ({
    ...m,
    surtidoPor: datosFarmacia.nombreFarmacia,
    telefono: datosFarmacia.telefono,
    fecha: new Date().toISOString()
  }));

  const previos = recetaGlobal.surtidoParcial || [];
  const actualizados = [...previos, ...nuevos];
  const esTotal = actualizados.length === recetaGlobal.medicamentos.length;

  await updateDoc(doc(db, "recetas", recetaIdActual), {
    surtidoParcial: actualizados,
    estado: esTotal ? "surtida" : "parcial"
  });

  alert("Receta actualizada.");
  location.reload();
};

