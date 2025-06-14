import { db, auth } from '../firebase-init.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const contenedor = document.getElementById("contenedor");
let recetasFiltradas = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    contenedor.innerHTML = "<p>Debes iniciar sesión para ver el historial.</p>";
    console.warn("No hay sesión activa");
    return;
  }

  console.log("Usuario autenticado:", user.uid);

  const q = query(collection(db, "recetas"), where("uid", "==", user.uid));
  const snapshot = await getDocs(q);

  console.log("Recetas encontradas:", snapshot.size);

  if (snapshot.empty) {
    contenedor.innerHTML = "<p>No se encontraron recetas.</p>";
    return;
  }

  const agrupadas = {};

  snapshot.forEach(docSnap => {
    const receta = docSnap.data();
    const recetaId = docSnap.id;
    const fechaRaw = receta.timestamp || receta.fecha || new Date().toISOString();
    const dia = fechaRaw.split("T")[0];
    const hora = fechaRaw.split("T")[1]?.split(".")[0] || "--:--";

    console.log("Receta procesada:", recetaId, receta);

    if (!agrupadas[dia]) agrupadas[dia] = [];
    agrupadas[dia].push({
      id: recetaId,
      nombrePaciente: receta.nombrePaciente,
      observaciones: receta.observaciones || '',
      medicamentos: receta.medicamentos || [],
      estado: receta.estado || 'pendiente',
      hora: hora
    });
  });

  recetasFiltradas = agrupadas;
  renderizarRecetas(agrupadas);
});

window.renderizarRecetas = (data) => {
  let html = "";
  const dias = Object.keys(data).sort().reverse();

  dias.forEach(dia => {
    html += `<div class="dia">${dia}</div>`;
    data[dia].forEach((r, index) => {
      const idDetalle = `detalle-${dia}-${index}`;
      html += `
        <div class="receta">
          <div class="cabecera" onclick="toggleDetalle('${idDetalle}')">
            👤 ${r.nombrePaciente} — 🕒 ${r.hora}
          </div>
          <div class="detalle" id="${idDetalle}">
            <strong>ID de receta:</strong> ${r.id}<br>
            <strong>Observaciones:</strong> ${r.observaciones}<br>
            <strong>Estado:</strong> ${r.estado}<br>
            <strong>Medicamentos:</strong>
            <ul>
              ${r.medicamentos.map(m => `<li>${m.nombre}, ${m.dosis}, ${m.duracion}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    });
  });

  contenedor.innerHTML = html;
};

window.toggleDetalle = (id) => {
  const elem = document.getElementById(id);
  elem.style.display = (elem.style.display === "block") ? "none" : "block";
};

window.filtrarRecetas = () => {
  const termino = document.getElementById("busqueda").value.toLowerCase();
  if (!termino) {
    renderizarRecetas(recetasFiltradas);
    return;
  }

  const filtradas = {};
  for (const dia in recetasFiltradas) {
    const recetasDelDia = recetasFiltradas[dia].filter(r =>
      r.nombrePaciente.toLowerCase().includes(termino)
    );
    if (recetasDelDia.length) {
      filtradas[dia] = recetasDelDia;
    }
  }
  renderizarRecetas(filtradas);
};
