
import { auth, db } from "/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Agrupar recetas por fecha
function agruparPorFecha(data) {
  const agrupado = {};
  data.forEach(receta => {
    const fecha = receta.timestamp?.toDate().toLocaleDateString() || "Sin fecha";
    if (!agrupado[fecha]) agrupado[fecha] = [];
    agrupado[fecha].push(receta);
  });
  return agrupado;
}

// Mostrar recetas
function mostrarRecetas(data) {
  const contenedor = document.getElementById("recetasContainer");
  contenedor.innerHTML = "";

  const recetasAgrupadas = agruparPorFecha(data);

  Object.keys(recetasAgrupadas).forEach(fecha => {
    const detalles = document.createElement("details");
    detalles.className = "lab-card";
    detalles.innerHTML = `
      <summary>${fecha}</summary>
      <div>${recetasAgrupadas[fecha].map(receta => `
        <div class="card" style="margin: 10px 0;">
          <strong>Paciente:</strong> ${receta.nombrePaciente}<br>
          <strong>Edad:</strong> ${receta.edad}<br>
          <strong>Observaciones:</strong> ${receta.observaciones || "Sin observaciones"}<br>
          <strong>Medicamentos:</strong>
          <ul>${receta.medicamentos.map(med => `<li>${med.nombre} - ${med.dosis} - ${med.duracion}</li>`).join("")}</ul>
        </div>
      `).join("")}</div>
    `;
    contenedor.appendChild(detalles);
  });
}

// Filtrar recetas por nombre
window.filtrarRecetas = (valor) => {
  const tarjetas = document.querySelectorAll(".card");
  tarjetas.forEach((card) => {
    const contiene = card.textContent.toLowerCase().includes(valor.toLowerCase());
    card.style.display = contiene ? "block" : "none";
  });
};

// Autenticación
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/medico/login.html";
    return;
  }

  try {
    const recetasRef = collection(db, "recetas");
    const q = query(recetasRef, where("uid", "==", user.uid), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);

    const recetas = [];
    querySnapshot.forEach(doc => {
      recetas.push({ id: doc.id, ...doc.data() });
    });

    mostrarRecetas(recetas);
  } catch (error) {
    console.error("Error al cargar recetas:", error);
  }
});
