
import { db, auth } from "/firebase-init.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let nombreFarmacia = "";
let recetas = [];

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const docRef = collection(db, "farmacias");
    const snapshot = await getDocs(docRef);
    snapshot.forEach(doc => {
      if (doc.id === user.uid) {
        nombreFarmacia = doc.data().nombreFarmacia;
      }
    });

    cargarRecetas();
  } else {
    document.getElementById("contenedor").innerText = "No estás autenticado.";
  }
});

async function cargarRecetas() {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "Cargando historial...";

  const snapshot = await getDocs(collection(db, "recetas"));
  const agrupadas = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const surtido = data.surtidoParcial || [];

    const fueSurtidaAqui = surtido.some(s => s.surtidoPor === nombreFarmacia);
    if (fueSurtidaAqui) {
      const fecha = new Date(data.timestamp?.seconds * 1000 || Date.now());
      const dia = fecha.toLocaleDateString("es-MX", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      if (!agrupadas[dia]) agrupadas[dia] = [];
      agrupadas[dia].push({ id: doc.id, ...data });
    }
  });

  recetas = Object.values(agrupadas).flat();
  mostrarRecetas(agrupadas);
}

function mostrarRecetas(agrupadas) {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "";

  if (Object.keys(agrupadas).length === 0) {
    contenedor.innerText = "No hay recetas surtidas aún.";
    return;
  }

  for (const dia in agrupadas) {
    const seccion = document.createElement("div");
    seccion.classList.add("dia");
    seccion.innerText = dia;
    contenedor.appendChild(seccion);

    agrupadas[dia].forEach(receta => {
      const recetaDiv = document.createElement("div");
      recetaDiv.className = "receta";

      const cabecera = document.createElement("div");
      cabecera.className = "cabecera";
      cabecera.textContent = receta.nombrePaciente + " - " + new Date(receta.timestamp?.seconds * 1000).toLocaleTimeString("es-MX");
      cabecera.onclick = () => detalle.style.display = detalle.style.display === "block" ? "none" : "block";

      const detalle = document.createElement("div");
      detalle.className = "detalle";
      detalle.innerHTML = `
        <strong>Edad:</strong> ${receta.edad}<br>
        <strong>Observaciones:</strong> ${receta.observaciones || "Ninguna"}<br>
        <strong>Estado:</strong> ${receta.estado || "parcial"}<br>
        <strong>Medicamentos surtidos:</strong>
        <ul>${(receta.surtidoParcial || []).map(m => `<li>${m.nombre} - ${m.dosis} - ${m.duracion}</li>`).join("")}</ul>
      `;

      recetaDiv.appendChild(cabecera);
      recetaDiv.appendChild(detalle);
      contenedor.appendChild(recetaDiv);
    });
  }
}

window.filtrarRecetas = (texto) => {
  const agrupadasFiltradas = {};

  recetas.forEach(receta => {
    if (receta.nombrePaciente.toLowerCase().includes(texto.toLowerCase())) {
      const fecha = new Date(receta.timestamp?.seconds * 1000 || Date.now());
      const dia = fecha.toLocaleDateString("es-MX", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

      if (!agrupadasFiltradas[dia]) agrupadasFiltradas[dia] = [];
      agrupadasFiltradas[dia].push(receta);
    }
  });

  mostrarRecetas(agrupadasFiltradas);
};
