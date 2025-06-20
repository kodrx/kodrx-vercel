
import { auth, db } from "/firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let historialGlobal = [];

function agruparPorDia(data) {
  const agrupado = {};
  data.forEach(item => {
    const fecha = new Date(item.fecha).toLocaleDateString();
    if (!agrupado[fecha]) agrupado[fecha] = [];
    agrupado[fecha].push(item);
  });
  return agrupado;
}

function renderizarHistorial(data) {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "";

  const porDia = agruparPorDia(data);
  Object.keys(porDia).forEach(dia => {
    const bloque = document.createElement("details");
    bloque.className = "lab-card";
    bloque.innerHTML = `
      <summary>${dia}</summary>
      <div>
        ${porDia[dia].map(receta => `
          <div class="card" style="margin: 10px 0;">
            <strong>Paciente:</strong> ${receta.nombrePaciente}<br>
            <strong>Médico:</strong> ${receta.medicoNombre}<br>
            <strong>Observaciones:</strong> ${receta.observaciones || "Sin observaciones"}<br>
            <strong>Medicamentos surtidos:</strong>
            <ul>
              ${receta.medicamentos.map(m => `
                <li>${m.nombre} - ${m.dosis} - ${m.duracion}</li>
              `).join("")}
            </ul>
          </div>
        `).join("")}
      </div>
    `;
    contenedor.appendChild(bloque);
  });
}

window.filtrarHistorial = (texto) => {
  const filtro = texto.toLowerCase();
  const filtrado = historialGlobal.filter(item =>
    item.nombrePaciente.toLowerCase().includes(filtro)
  );
  renderizarHistorial(filtrado);
};

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.href = "/farmacia/login.html";

  try {
    const recetasRef = collection(db, "recetas");
    const q = query(recetasRef, where("estado", "!=", null), orderBy("estado"));
    const snapshot = await getDocs(q);

    const resultado = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const surtidos = data.surtidoParcial || [];
      surtidos.forEach(med => {
        if (med.surtidoPor === user.displayName || med.telefono === user.phoneNumber || med.surtidoPor?.includes(user.email)) {
          resultado.push({
            nombrePaciente: data.nombrePaciente,
            medicoNombre: data.medicoNombre,
            observaciones: data.observaciones,
            medicamentos: [med],
            fecha: med.fecha
          });
        }
      });
    });

    historialGlobal = resultado;
    renderizarHistorial(historialGlobal);
  } catch (error) {
    document.getElementById("contenedor").innerHTML = "<p>Error al cargar historial.</p>";
    console.error(error);
  }
});
