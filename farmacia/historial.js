import { db, auth } from "../firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let recetasGlobal = [];

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDocs(
      query(collection(db, "farmacias"), where("__name__", "==", user.uid))
    );
    if (!snap.empty) {
      const datos = snap.docs[0].data();
      cargarHistorial(datos.nombreFarmacia);
    }
  } else {
    location.href = "login.html";
  }
});

async function cargarHistorial(nombreFarmacia) {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "Cargando...";

  try {
    const recetasSnap = await getDocs(collection(db, "recetas"));
    const recetas = [];

    recetasSnap.forEach((doc) => {
      const data = doc.data();
      const surtido = data.surtidoParcial || [];
      const surtidaPorEstaFarmacia = surtido.some(
        (s) => s.surtidoPor === nombreFarmacia
      );

      if (surtidaPorEstaFarmacia) {
        recetas.push({
          ...data,
          id: doc.id,
          fecha: data.timestamp?.toDate() || new Date()
        });
      }
    });

    recetas.sort((a, b) => b.fecha - a.fecha); // Más recientes primero
    recetasGlobal = recetas;

    renderizarRecetas(recetas);
  } catch (err) {
    contenedor.innerHTML = `<p>Error al cargar historial: ${err.message}</p>`;
  }
}

function renderizarRecetas(recetas) {
  const contenedor = document.getElementById("contenedor");
  if (recetas.length === 0) {
    contenedor.innerHTML = "<p>No hay recetas surtidas por esta farmacia.</p>";
    return;
  }

  const agrupadas = {};

  recetas.forEach((r) => {
    const dia = r.fecha.toLocaleDateString();
    if (!agrupadas[dia]) agrupadas[dia] = [];
    agrupadas[dia].push(r);
  });

  let html = "";

  Object.keys(agrupadas).forEach((dia) => {
    html += `<div class="dia">${dia}</div>`;
    agrupadas[dia].forEach((receta) => {
      html += `
        <details class="lab-card">
          <summary><strong>${receta.nombrePaciente}</strong> — ${receta.edad} años</summary>
          <div>
            <p><strong>Observaciones:</strong> ${receta.observaciones || "Ninguna"}</p>
           <p><strong>Médico:</strong> ${receta.medicoNombre || receta.medico || "s/n"}</p>
            <ul>
              ${receta.medicamentos
                .map(
                  (m) =>
                    `<li>${m.nombre} - ${m.dosis} - ${m.duracion}</li>`
                )
                .join("")}
            </ul>
          </div>
        </details>
      `;
    });
  });

  contenedor.innerHTML = html;
}

window.filtrarRecetas = function (valor) {
  const filtradas = recetasGlobal.filter((r) =>
    r.nombrePaciente.toLowerCase().includes(valor.toLowerCase())
  );
  renderizarRecetas(filtradas);
};
