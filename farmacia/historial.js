
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const contenedor = document.getElementById("contenedor");
let recetasPorDia = {};

onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "login.html";
  const q = query(collection(db, "recetas"), where("estado", "!=", ""));
  const snapshot = await getDocs(q);

  recetasPorDia = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const surtidos = data.surtidoParcial || [];

    if (!surtidos.find(m => m.surtidoPor === user.email)) return;

    const fecha = new Date(surtidos[0].fecha).toLocaleDateString();
    if (!recetasPorDia[fecha]) recetasPorDia[fecha] = [];

    recetasPorDia[fecha].push({ id: doc.id, data });
  });

  renderizarRecetas(recetasPorDia);
});

function renderizarRecetas(recetas) {
  contenedor.innerHTML = "";
  const fechas = Object.keys(recetas).sort((a, b) => new Date(b) - new Date(a));

  if (fechas.length === 0) {
    contenedor.innerHTML = "<p>No hay recetas surtidas aún.</p>";
    return;
  }

  fechas.forEach(fecha => {
    const seccion = document.createElement("section");
    seccion.className = "dia";
    seccion.innerHTML = `<h3>${fecha}</h3>`;

    recetas[fecha].forEach(({ id, data }) => {
      const detalle = document.createElement("details");
      detalle.className = "lab-card";

      const resumen = document.createElement("summary");
      resumen.textContent = `${data.nombrePaciente} - ${data.edad} años`;
      detalle.appendChild(resumen);

      const cuerpo = document.createElement("div");
      cuerpo.innerHTML = `
        <p><strong>Observaciones:</strong> ${data.observaciones || "Ninguna"}</p>
        <p><strong>Médico:</strong> ${data.medicoNombre || "N/D"}</p>
        <p><strong>Medicamentos:</strong></p>
        <ul>
          ${data.medicamentos.map(m => `<li>${m.nombre} - ${m.dosis} - ${m.duracion}</li>`).join("")}
        </ul>
      `;
      detalle.appendChild(cuerpo);
      seccion.appendChild(detalle);
    });

    contenedor.appendChild(seccion);
  });
}

window.filtrarRecetas = function(valor) {
  const resultado = {};
  Object.entries(recetasPorDia).forEach(([fecha, recetas]) => {
    const filtradas = recetas.filter(r =>
      r.data.nombrePaciente.toLowerCase().includes(valor.toLowerCase())
    );
    if (filtradas.length > 0) resultado[fecha] = filtradas;
  });
  renderizarRecetas(resultado);
};
