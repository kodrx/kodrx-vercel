// historialMedico.js
import { db, auth } from "/firebase-init.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const historialDiv = document.getElementById("historial");

  const user = auth.currentUser;
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

  snapshot.forEach(doc => {
    const receta = doc.data();
    const fecha = receta.timestamp.toDate().toLocaleString();

    const card = document.createElement("div");
    card.classList.add("acordeon");

    const header = document.createElement("div");
    header.classList.add("acordeon-header");
    header.textContent = `${receta.nombrePaciente} - ${fecha}`;

    const body = document.createElement("div");
    body.classList.add("acordeon-body");

    body.innerHTML = `
      <p><strong>Edad:</strong> ${receta.edad || "—"}</p>
      <p><strong>Diagnóstico:</strong> ${receta.diagnostico || "—"}</p>
      <p><strong>Medicamentos:</strong> ${receta.medicamentos?.map(m => `${m.nombre} (${m.dosis} / ${m.duracion})`).join(", ")}</p>
      <a class="boton-ver" href="/medico/ver-receta.html?id=${doc.id}" target="_blank">Ver receta</a>
    `;

    header.addEventListener("click", () => {
      card.classList.toggle("open");
    });

    card.appendChild(header);
    card.appendChild(body);
    historialDiv.appendChild(card);
  });
});

