
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

console.log("[INICIO] adminMedicos-debug.js cargado");

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== "admin@kodrx.app") {
    window.location.href = "/admin/login.html";
  } else {
    console.log("[AUTH] Acceso permitido para admin");
    cargarMedicos();
    document.getElementById("buscador").addEventListener("input", filtrarMedicos);
  }
});

let listaGlobal = [];

async function cargarMedicos() {
  const contenedor = document.getElementById("listaMedicos");
  contenedor.innerHTML = "Cargando médicos...";

  try {
    const querySnapshot = await getDocs(collection(db, "medicos"));
    if (querySnapshot.empty) {
      contenedor.innerHTML = "<p>No hay médicos registrados.</p>";
      return;
    }

    listaGlobal = querySnapshot.docs.map(doc => doc.data());
    renderizarLista(listaGlobal);

  } catch (error) {
    contenedor.innerHTML = `<p>Error al cargar médicos: ${error.message}</p>`;
  }
}

function renderizarLista(medicos) {
  const contenedor = document.getElementById("listaMedicos");
  contenedor.innerHTML = "";

  medicos.forEach((med) => {
    const card = document.createElement("details");
    card.className = "lab-card";

    const summary = document.createElement("summary");
    summary.innerHTML = `<strong>${med.nombre}</strong>`;
    card.appendChild(summary);

    const contenido = document.createElement("div");
    contenido.innerHTML = `
      <p><strong>Correo:</strong> ${med.correo}</p>
      <p><strong>Cédula:</strong> ${med.cedula || "No especificada"}</p>
      <p><strong>Especialidad:</strong> ${med.especialidad || "No especificada"}</p>
      <p><strong>Fecha de registro:</strong> ${med.fechaRegistro?.toDate().toLocaleString() || "N/D"}</p>
    `;

    card.appendChild(contenido);
    contenedor.appendChild(card);
  });
}

function filtrarMedicos(e) {
  const texto = e.target.value.toLowerCase();
  const filtrados = listaGlobal.filter(m =>
    m.nombre.toLowerCase().includes(texto) ||
    (m.especialidad || "").toLowerCase().includes(texto)
  );
  renderizarLista(filtrados);
}
