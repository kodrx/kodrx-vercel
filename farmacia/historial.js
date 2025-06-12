// historial.js
import { db, auth } from '../firebase-init.js';
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const contenedor = document.getElementById("contenedor");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    contenedor.innerHTML = "<p>Debes iniciar sesión para ver el historial.</p>";
    return;
  }

  const farmaciaRef = doc(db, "farmacias", user.uid);
  const snap = await getDoc(farmaciaRef);
  const nombreFarmacia = snap.exists() ? snap.data().nombreFarmacia : null;

  if (!nombreFarmacia) {
    contenedor.innerHTML = "<p>Error: No se pudo obtener el nombre de la farmacia.</p>";
    return;
  }

  const recetasRef = collection(db, "recetas");
  const q = query(recetasRef, where("surtidoParcial", "!=", null));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    contenedor.innerHTML = "<p>No se encontraron recetas surtidas.</p>";
    return;
  }

  const agrupadas = {};

  snapshot.forEach(docSnap => {
    const receta = docSnap.data();
    const surtidos = receta.surtidoParcial || [];

    surtidos.forEach(med => {
      if (med.surtidoPor === nombreFarmacia) {
        const fecha = med.fecha || receta.fecha || "Sin fecha";
        const dia = fecha.split("T")[0];
        if (!agrupadas[dia]) agrupadas[dia] = [];
        agrupadas[dia].push({
          id: docSnap.id,
          nombrePaciente: receta.nombrePaciente,
          estado: receta.estado,
          fechaHora: fecha,
          medicamento: `${med.nombre}, ${med.dosis}, ${med.duracion}`
        });
      }
    });
  });

  let html = "";
  const dias = Object.keys(agrupadas).sort().reverse();

  dias.forEach(dia => {
    html += `<div class="dia">${dia}</div>`;
    agrupadas[dia].forEach((r, index) => {
      const idDetalle = `detalle-${dia}-${index}`;
      html += `
        <div class="receta">
          <div class="cabecera" onclick="toggleDetalle('${idDetalle}')">
            👤 ${r.nombrePaciente} — 🕒 ${r.fechaHora.split("T")[1] || "—"}
          </div>
          <div class="detalle" id="${idDetalle}">
            <strong>ID:</strong> ${r.id}<br>
            <strong>Medicamento:</strong> ${r.medicamento}<br>
            <strong>Estado:</strong> ${r.estado}
          </div>
        </div>
      `;
    });
  });

  contenedor.innerHTML = html;
});

// Función global para el acordeón
window.toggleDetalle = (id) => {
  const elem = document.getElementById(id);
  if (elem.style.display === "block") {
    elem.style.display = "none";
  } else {
    elem.style.display = "block";
  }
};
