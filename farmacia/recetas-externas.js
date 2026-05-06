import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

/* 
  Dev:
  Aquí debes pegar el mismo firebaseConfig que ya usa KodRx.
*/
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let usuarioActual = null;

const form = document.getElementById("formRecetaExterna");
const lista = document.getElementById("listaRecetasExternas");
const panelRevision = document.getElementById("panelRevision");
const visorReceta = document.getElementById("visorReceta");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/acceso.html";
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

  const archivo = document.getElementById("archivoReceta").files[0];

  if (!archivo) {
    alert("Debes subir una receta escaneada.");
    return;
  }

  try {
    const pacienteNombre = document.getElementById("pacienteNombre").value.trim();
    const medicoNombre = document.getElementById("medicoNombre").value.trim();
    const fechaReceta = document.getElementById("fechaReceta").value;
    const canalRecepcion = document.getElementById("canalRecepcion").value;
    const folioInterno = document.getElementById("folioInterno").value.trim();

    const archivoPath = `recetas_externas/${usuarioActual.uid}/${Date.now()}_${archivo.name}`;
    const archivoRef = ref(storage, archivoPath);

    await uploadBytes(archivoRef, archivo);
    const archivoUrl = await getDownloadURL(archivoRef);

    await addDoc(collection(db, "recetas_externas"), {
      farmaciaUid: usuarioActual.uid,
      farmaciaEmail: usuarioActual.email,
      farmaciaNombre: usuarioActual.displayName || "Farmacia KodRx",

      pacienteNombre,
      medicoNombre,
      fechaReceta,
      canalRecepcion,
      folioInterno,

      archivoUrl,
      archivoNombre: archivo.name,
      archivoTipo: archivo.type,
      archivoPath,

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
      revisadoPorUid: null,
      revisadoPorEmail: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      revisadoAt: null
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
