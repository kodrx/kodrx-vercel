import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let listaGlobal = [];

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== "admin@kodrx.app") {
    window.location.href = "/admin/login.html";
  } else {
    console.log("[AUTH] Acceso permitido para admin");

    const iniciar = () => {
      console.log("[DOM] DOM listo. Iniciando cargarFarmacias()");
      cargarFarmacias();
      document.getElementById("buscador").addEventListener("input", filtrarFarmacias);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", iniciar);
    } else {
      iniciar();
    }
  }
});

async function cargarFarmacias() {
  const contVerificadas = document.getElementById("farmaciasVerificadas");
  const contPendientes = document.getElementById("farmaciasPendientes");

  if (!contVerificadas || !contPendientes) {
    console.error("[ERROR] Contenedores no encontrados en el DOM");
    return;
  }

  contVerificadas.innerHTML = "Cargando farmacias verificadas...";
  contPendientes.innerHTML = "Cargando farmacias pendientes...";

  try {
    const querySnapshot = await getDocs(collection(db, "farmacias"));
    if (querySnapshot.empty) {
      contVerificadas.innerHTML = "<p>No hay farmacias registradas.</p>";
      contPendientes.innerHTML = "";
      return;
    }

    listaGlobal = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const verificadas = listaGlobal.filter(f => f.verificado);
    const pendientes = listaGlobal.filter(f => !f.verificado);

    renderizarLista(verificadas, contVerificadas);
    renderizarLista(pendientes, contPendientes);

  } catch (error) {
    contVerificadas.innerHTML = `<p>Error al cargar farmacias: ${error.message}</p>`;
    contPendientes.innerHTML = "";
  }
}

function renderizarLista(farmacias, contenedor) {
  contenedor.innerHTML = "";

  farmacias.forEach(f => {
    const card = document.createElement("details");
    card.className = "lab-card";

    const summary = document.createElement("summary");
    summary.innerHTML = `<strong>${f.nombreFarmacia || "Sin nombre"}</strong> - ${f.colonia || "Sin colonia"}`;
    card.appendChild(summary);

    const contenido = document.createElement("div");
    contenido.innerHTML = `
      <p><strong>Correo:</strong> ${f.correo || "N/D"}</p>
      <p><strong>Teléfono:</strong> ${f.telefono || "N/D"}</p>
      <p><strong>Responsable:</strong> ${f.medicoResponsable || "No registrado"}</p>
      <p><strong>Colonia:</strong> ${f.colonia || "No registrada"}</p>
      <p><strong>Municipio:</strong> ${f.municipio || "No registrado"}</p>
      <p><strong>Estado:</strong> ${f.estado || "No registrado"}</p>
    `;

    if (f.verificado) {
      const etiqueta = document.createElement("span");
      etiqueta.innerText = "✅ Verificada";
      etiqueta.style.color = "green";
      etiqueta.style.fontWeight = "bold";
      contenido.appendChild(etiqueta);
    } else {
      const btn = document.createElement("button");
      btn.innerText = "Verificar ahora";
      btn.onclick = async () => {
        await updateDoc(doc(db, "farmacias", f.id), { verificado: true });
        alert("Farmacia verificada");
        cargarFarmacias();
      };
      contenido.appendChild(btn);
    }

    card.appendChild(contenido);
    contenedor.appendChild(card);
  });
}

function filtrarFarmacias(e) {
  const texto = e.target.value.toLowerCase();
  const verificadas = listaGlobal.filter(f => f.verificado &&
    ((f.nombreFarmacia || "").toLowerCase().includes(texto) ||
     (f.colonia || "").toLowerCase().includes(texto)));

  const pendientes = listaGlobal.filter(f => !f.verificado &&
    ((f.nombreFarmacia || "").toLowerCase().includes(texto) ||
     (f.colonia || "").toLowerCase().includes(texto)));

  renderizarLista(verificadas, document.getElementById("farmaciasVerificadas"));
  renderizarLista(pendientes, document.getElementById("farmaciasPendientes"));
}

