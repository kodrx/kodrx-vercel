
import { auth, db } from "../firebase-init.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Organizar recetas por fecha
function agruparPorFecha(recetas) {
  const agrupadas = {};
  recetas.forEach((rec) => {
    const fecha = new Date(rec.fecha).toLocaleDateString();
    if (!agrupadas[fecha]) agrupadas[fecha] = [];
    agrupadas[fecha].push(rec);
  });
  return agrupadas;
}

function crearAcordeon(fecha, recetas) {
  const seccion = document.createElement("div");
  const titulo = document.createElement("h3");
  titulo.textContent = fecha;
  titulo.className = "dia";
  seccion.appendChild(titulo);

  recetas.forEach((receta, i) => {
    const details = document.createElement("details");
    details.className = "lab-card";

    const resumen = document.createElement("summary");
    resumen.textContent = `Paciente: ${receta.paciente}`;
    details.appendChild(resumen);

    const contenido = document.createElement("div");
    contenido.innerHTML = receta.medicamentos.map(
      (m) => `<p>💊 ${m.nombre} - ${m.dosis} - ${m.duracion}</p>`
    ).join("");
    details.appendChild(contenido);

    seccion.appendChild(details);
  });

  return seccion;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "Cargando recetas surtidas...";

  const snapFarmacia = await getDoc(doc(db, "farmacias", user.uid));
  const nombreFarmacia = snapFarmacia.exists() ? snapFarmacia.data().nombreFarmacia : null;

  const recetasSnap = await getDocs(query(collection(db, "recetas"), orderBy("timestamp", "desc")));

  const surtidas = [];

  recetasSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const surtido = data.surtidoParcial || [];

    surtido.forEach((med) => {
      if (med.surtidoPor === nombreFarmacia) {
        surtidas.push({
          paciente: data.nombrePaciente,
          fecha: med.fecha || data.timestamp?.toDate(),
          medicamentos: [med]
        });
      }
    });
  });

  if (surtidas.length === 0) {
    contenedor.innerHTML = "<p>No se encontraron recetas surtidas por esta farmacia.</p>";
    return;
  }

  const agrupadas = agruparPorFecha(surtidas);
  contenedor.innerHTML = "";

  Object.keys(agrupadas).forEach((fecha) => {
    contenedor.appendChild(crearAcordeon(fecha, agrupadas[fecha]));
  });
});
