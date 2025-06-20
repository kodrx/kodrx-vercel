
import { db, auth } from '../firebase-init.js';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let recetasAgrupadas = {};

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const ref = collection(db, "recetas");
  const q = query(ref, where("surtidoParcial", "array-contains-any", [{
    surtidoPor: "", telefono: "", nombre: "", dosis: "", duracion: "", fecha: ""
  }]));

  try {
    const snap = await getDocs(ref);
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(receta =>
        receta.surtidoParcial?.some(s => s.surtidoPor && s.telefono) &&
        receta.surtidoParcial.find(s => s.telefono && user.email.includes(s.telefono))
      );

    mostrarRecetas(data);
  } catch (e) {
    console.error("Error al cargar historial:", e);
    document.getElementById("contenedor").innerHTML = "<p>Error al cargar historial</p>";
  }
});

function mostrarRecetas(recetas) {
  const contenedor = document.getElementById("contenedor");
  recetasAgrupadas = {};

  recetas.forEach(receta => {
    const fecha = new Date(receta.timestamp?.seconds * 1000).toLocaleDateString("es-MX");
    if (!recetasAgrupadas[fecha]) recetasAgrupadas[fecha] = [];
    recetasAgrupadas[fecha].push(receta);
  });

  renderizarHistorial(recetasAgrupadas);
}

function renderizarHistorial(data) {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "";

  Object.keys(data).sort((a, b) => new Date(b) - new Date(a)).forEach(dia => {
    const diaDiv = document.createElement("div");
    diaDiv.classList.add("dia");
    diaDiv.textContent = dia;
    contenedor.appendChild(diaDiv);

    data[dia].forEach(receta => {
      const recetaDiv = document.createElement("div");
      recetaDiv.classList.add("receta");

      const cabecera = document.createElement("div");
      cabecera.classList.add("cabecera");
      cabecera.textContent = `Paciente: ${receta.nombrePaciente}`;
      cabecera.onclick = () => {
        detalle.style.display = detalle.style.display === "none" ? "block" : "none";
      };

      const detalle = document.createElement("div");
      detalle.classList.add("detalle");
      detalle.innerHTML = `
        Edad: ${receta.edad} <br>
        Observaciones: ${receta.observaciones || 'Ninguna'}<br>
        Médico: ${receta.medicoNombre || 'Desconocido'}<br><br>
        <strong>Medicamentos surtidos:</strong>
        <ul>${receta.surtidoParcial?.map(med => `<li>${med.nombre}, ${med.dosis}, ${med.duracion}</li>`).join('')}</ul>
      `;

      recetaDiv.appendChild(cabecera);
      recetaDiv.appendChild(detalle);
      contenedor.appendChild(recetaDiv);
    });
  });

  // Agregar link de regreso
  const volver = document.createElement("p");
  volver.style.textAlign = "center";
  volver.innerHTML = '<a href="panel.html">← Volver al panel</a>';
  contenedor.appendChild(volver);
}

window.filtrarRecetas = (texto) => {
  const filtro = texto.toLowerCase();
  const filtradas = {};

  Object.keys(recetasAgrupadas).forEach(dia => {
    const recetasDelDia = recetasAgrupadas[dia].filter(r =>
      r.nombrePaciente.toLowerCase().includes(filtro)
    );
    if (recetasDelDia.length) filtradas[dia] = recetasDelDia;
  });

  renderizarHistorial(filtradas);
};
