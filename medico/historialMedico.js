// historialMedico.js PRO
import { db, auth, onAuthStateChanged } from "/firebase-init.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const historialDiv = document.getElementById("historial");

  // 🧠 Campo de búsqueda
  const buscador = document.createElement("input");
  buscador.type = "text";
  buscador.id = "buscador";
  buscador.placeholder = "Buscar paciente...";
  buscador.style.marginBottom = "1rem";
  buscador.style.padding = "0.5rem";
  buscador.style.width = "100%";
  buscador.style.display = "block";
buscador.style.margin = "1rem auto";
buscador.style.padding = "0.5rem 1rem";
buscador.style.fontSize = "1rem";
buscador.style.borderRadius = "8px";
buscador.style.border = "1px solid #ccc";
buscador.style.width = "100%";
buscador.style.maxWidth = "400px";
historialDiv.appendChild(buscador);

  const contenedorGrupos = document.createElement("div");
  historialDiv.appendChild(contenedorGrupos);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      historialDiv.innerHTML = "<p>No has iniciado sesión.</p>";
      return;
    }

    const q = query(
      collection(db, "recetas"),
      where("correo", "==", user.email),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      historialDiv.innerHTML = "<p>No has emitido recetas todavía.</p>";
      return;
    }

    const gruposPorFecha = {};

    snapshot.forEach(doc => {
      const receta = doc.data();
      const fechaObj = receta.timestamp.toDate();
      const fechaClave = fechaObj.toLocaleDateString();

      if (!gruposPorFecha[fechaClave]) gruposPorFecha[fechaClave] = [];

      gruposPorFecha[fechaClave].push({ id: doc.id, receta, hora: fechaObj.toLocaleTimeString() });
    });

    Object.entries(gruposPorFecha).forEach(([fecha, recetas]) => {
      const grupo = document.createElement("div");
      grupo.classList.add("acordeon");

      const header = document.createElement("div");
      header.classList.add("acordeon-header");
      header.textContent = `📅 ${fecha} (${recetas.length})`;

      const body = document.createElement("div");
      body.classList.add("acordeon-body");

      recetas.forEach(({ id, receta, hora }) => {
        const sub = document.createElement("div");
        sub.classList.add("acordeon");

        const h2 = document.createElement("div");
        h2.classList.add("acordeon-header");
        h2.textContent = `${receta.nombrePaciente} – ${hora}`;

        const inner = document.createElement("div");
        inner.classList.add("acordeon-body");
        inner.innerHTML = `
          <p><strong>Edad:</strong> ${receta.edad || "—"}</p>
          <p><strong>Diagnóstico:</strong> ${receta.diagnostico || "—"}</p>
          <p><strong>Medicamentos:</strong> ${receta.medicamentos?.map(m => `${m.nombre} (${m.dosis} / ${m.duracion})`).join(", ")}</p>
          <a class="boton-ver" href="/medico/ver-receta.html?id=${id}">Ver receta</a>
        `;

        h2.addEventListener("click", () => {
          sub.classList.toggle("open");
        });

        sub.appendChild(h2);
        sub.appendChild(inner);
        body.appendChild(sub);
      });

      header.addEventListener("click", () => {
        grupo.classList.toggle("open");
      });

      grupo.appendChild(header);
      grupo.appendChild(body);
      contenedorGrupos.appendChild(grupo);
    });

    buscador.addEventListener("input", (e) => {
  const termino = e.target.value.toLowerCase();

  document.querySelectorAll(".acordeon-body .acordeon-header").forEach(header => {
    const card = header.parentElement;
    const texto = header.textContent.toLowerCase();

    if (texto.includes(termino)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });

