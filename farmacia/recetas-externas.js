import { auth, db } from '/firebase-init.js';

import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

let usuarioActual = null;

const form = document.getElementById("formRecetaExterna");
const lista = document.getElementById("listaRecetasExternas");
const panelRevision = document.getElementById("panelRevision");
const visorReceta = document.getElementById("visorReceta");

onAuthStateChanged(auth, async (user) => {
if (!user) {
  alert("Inicia sesión como farmacia para acceder a este módulo.");
  return;
}

  usuarioActual = user;
  await cargarRecetasExternas();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!usuarioActual) {
    alert("Sesión no válida.");
    return;
  }

const archivoUrl = document.getElementById("archivoUrl").value.trim();
if (!archivoUrl) {
  alert("Debes ingresar la URL de la receta.");
  return;
}

  try {
    const pacienteNombre = document.getElementById("pacienteNombre").value.trim();
    const medicoNombre = document.getElementById("medicoNombre").value.trim();
    const fechaReceta = document.getElementById("fechaReceta").value;
    const canalRecepcion = document.getElementById("canalRecepcion").value;
    const folioInterno = `REX-${new Date().getFullYear()}-${Date.now()}`;

await addDoc(collection(db, "recetas_externas"), {
  farmaciaUid: usuarioActual.uid,
  farmaciaEmail: usuarioActual.email,

  pacienteNombre,
  medicoNombre,
  fechaReceta,
  canalRecepcion,
  folioInterno,

  archivoUrl,
  archivoNombre: "receta externa demo",
  archivoTipo: archivoUrl.toLowerCase().includes(".pdf")
    ? "application/pdf"
    : "image/jpeg",

  estadoRevision: "pendiente",

  checklist: {
    medicoVisible: false,
    cedulaVisible: false,
    pacienteVisible: false,
    fechaVisible: false,
    medicamentoLegible: false,
    firmaVisible: false,
    recetaVencida: false,
    datosInconsistentes: false
  },

  observaciones: "",

  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
});

    alert("Receta externa guardada correctamente.");
    form.reset();
    await cargarRecetasExternas();

  } catch (error) {
    console.error("Error guardando receta externa:", error);
    alert("No se pudo guardar la receta externa.");
  }
});

async function cargarRecetasExternas() {
  lista.innerHTML = "<p>Cargando recetas...</p>";

  try {
    const q = query(
      collection(db, "recetas_externas"),
      where("farmaciaUid", "==", usuarioActual.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      lista.innerHTML = "<p>No hay recetas externas registradas.</p>";
      return;
    }

    lista.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const item = document.createElement("div");
      item.className = "rx-list-item";

      item.innerHTML = `
        <strong>${data.pacienteNombre || "Paciente sin nombre"}</strong>
        <p>${data.medicoNombre || "Médico no capturado"}</p>
        <span class="rx-status">${formatearEstado(data.estadoRevision)}</span>
      `;

      item.addEventListener("click", () => abrirRevision(docSnap.id, data));

      lista.appendChild(item);
    });

  } catch (error) {
    console.error("Error cargando recetas externas:", error);
    lista.innerHTML = "<p>Error cargando recetas externas.</p>";
  }
}

function abrirRevision(id, data) {
  panelRevision.classList.remove("rx-hidden");

  document.getElementById("recetaIdActiva").value = id;
  document.getElementById("estadoRevision").value = data.estadoRevision || "pendiente";
  document.getElementById("observaciones").value = data.observaciones || "";

  const checklist = data.checklist || {};

  document.getElementById("medicoVisible").checked = !!checklist.medicoVisible;
  document.getElementById("cedulaVisible").checked = !!checklist.cedulaVisible;
  document.getElementById("pacienteVisible").checked = !!checklist.pacienteVisible;
  document.getElementById("fechaVisible").checked = !!checklist.fechaVisible;
  document.getElementById("medicamentoLegible").checked = !!checklist.medicamentoLegible;
  document.getElementById("firmaVisible").checked = !!checklist.firmaVisible;
  document.getElementById("recetaVencida").checked = !!checklist.recetaVencida;
  document.getElementById("datosInconsistentes").checked = !!checklist.datosInconsistentes;

  visorReceta.innerHTML = "";

  if (data.archivoTipo && data.archivoTipo.includes("pdf")) {
    visorReceta.innerHTML = `<iframe src="${data.archivoUrl}"></iframe>`;
  } else {
    visorReceta.innerHTML = `<img src="${data.archivoUrl}" alt="Receta externa escaneada" />`;
  }

  panelRevision.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("guardarRevision").addEventListener("click", async () => {
  const recetaId = document.getElementById("recetaIdActiva").value;

  if (!recetaId) {
    alert("No hay receta seleccionada.");
    return;
  }

  try {
    const estadoRevision = document.getElementById("estadoRevision").value;

    const checklist = {
      medicoVisible: document.getElementById("medicoVisible").checked,
      cedulaVisible: document.getElementById("cedulaVisible").checked,
      pacienteVisible: document.getElementById("pacienteVisible").checked,
      fechaVisible: document.getElementById("fechaVisible").checked,
      medicamentoLegible: document.getElementById("medicamentoLegible").checked,
      firmaVisible: document.getElementById("firmaVisible").checked,
      recetaVencida: document.getElementById("recetaVencida").checked,
      datosInconsistentes: document.getElementById("datosInconsistentes").checked
    };

    const observaciones = document.getElementById("observaciones").value.trim();

    await updateDoc(doc(db, "recetas_externas", recetaId), {
      estadoRevision,
      checklist,
      observaciones,
      revisadoPorUid: usuarioActual.uid,
      revisadoPorEmail: usuarioActual.email,
      revisadoAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("Dictamen guardado correctamente.");
    await cargarRecetasExternas();

  } catch (error) {
    console.error("Error guardando dictamen:", error);
    alert("No se pudo guardar el dictamen.");
  }
});

function formatearEstado(estado) {
  const estados = {
    pendiente: "Pendiente",
    aprobada: "Aprobada",
    rechazada: "Rechazada",
    sospechosa: "Sospechosa",
    requiere_validacion: "Requiere validación"
  };

  return estados[estado] || estado;
}
