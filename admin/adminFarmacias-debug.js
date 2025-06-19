
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

console.log("[INICIO] adminFarmacias-debug.js cargado");

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== "admin@kodrx.app") {
    window.location.href = "/admin/login.html";
  } else {
    console.log("[AUTH] Acceso permitido para admin");
    cargarFarmacias();
    document.getElementById("buscador").addEventListener("input", filtrarFarmacias);
  }
});

let listaGlobal = [];

async function cargarFarmacias() {
  const contenedor = document.getElementById("listaFarmacias");
  contenedor.innerHTML = "Cargando farmacias...";

  try {
    const querySnapshot = await getDocs(collection(db, "farmacias"));
    if (querySnapshot.empty) {
      contenedor.innerHTML = "<p>No hay farmacias registradas.</p>";
      return;
    }

    listaGlobal = querySnapshot.docs.map(doc => doc.data());
    renderizarLista(listaGlobal);

  } catch (error) {
    contenedor.innerHTML = `<p>Error al cargar farmacias: ${error.message}</p>`;
  }
}

function renderizarLista(farmacias) {
  const contenedor = document.getElementById("listaFarmacias");
  contenedor.innerHTML = "";

  farmacias.forEach((farm) => {
    const card = document.createElement("details");
    card.className = "lab-card";

    const summary = document.createElement("summary");
    summary.innerHTML = `<strong>${farm.nombre}</strong>`;
    card.appendChild(summary);

    const contenido = document.createElement("div");
    contenido.innerHTML = `
      <p><strong>Responsable:</strong> ${farm.responsable || "No registrado"}</p>
      <p><strong>Correo:</strong> ${farm.correo}</p>
      <p><strong>Teléfono:</strong> ${farm.telefono}</p>
      <p><strong>Colonia:</strong> ${farm.colonia || "N/D"}</p>
      <p><strong>Municipio:</strong> ${farm.municipio || "N/D"}</p>
      <p><strong>Estado:</strong> ${farm.estado || "N/D"}</p>
    `;

    card.appendChild(contenido);
    contenedor.appendChild(card);
  });
}

function filtrarFarmacias(e) {
  const texto = e.target.value.toLowerCase();
  const filtradas = listaGlobal.filter(f =>
    f.nombre.toLowerCase().includes(texto) ||
    (f.colonia || "").toLowerCase().includes(texto)
  );
  renderizarLista(filtradas);
}
