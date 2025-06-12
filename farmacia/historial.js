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
    const recetaId = docSnap.id;

    const medsFarmacia = surtidos.filter(med => med.surtidoPor === nombreFarmacia);

    if (medsFarmacia.length > 0) {
      const fecha = medsFarmacia[0].fecha || receta.fecha || "Sin fecha";
      const dia = fecha.split("T")[0];
      if (!agrupadas[dia]) agrupadas[dia] = [];
      agrupadas[dia].push({
        id: recetaId,
        nombrePaciente: receta.nombrePaciente,
        estado: receta.estado,
        fechaHora: fecha,
        medicamentos: medsFarmacia.map(m => `${m.nombre}, ${m.dosis}, ${m.duracion}`)
      });
    }
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
            <strong>ID de receta:</strong> ${r.id}<br>
            <strong>Medicamentos surtidos:</strong><ul>
              ${r.medicamentos.map(m => `<li>${m}</li>`).join("")}
            </ul>
            <strong>Estado:</strong> ${r.estado}
          </div>
        </div>
      `;
    });
  });

  contenedor.innerHTML = html;
});

window.toggleDetalle = (id) => {
  const elem = document.getElementById(id);
  elem.style.display = (elem.style.display === "block") ? "none" : "block";
};
