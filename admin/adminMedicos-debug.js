import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

console.log("[INICIO] adminMedicos-debug.js cargado");

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== "admin@kodrx.app") {
    window.location.href = "/admin/login.html";
  } else {
    console.log("[AUTH] Acceso permitido para admin");
    cargarMedicos();
    document.getElementById("buscador").addEventListener("input", filtrarMedicos);
  }
});

let medicosGlobal = [];

async function cargarMedicos() {
  const contenedor = document.getElementById("listaMedicos");
  contenedor.innerHTML = "Cargando médicos...";

  try {
    const querySnapshot = await getDocs(collection(db, "medicos"));
    if (querySnapshot.empty) {
      contenedor.innerHTML = "<p>No hay médicos registrados.</p>";
      return;
    }

    medicosGlobal = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    renderizarMedicos(medicosGlobal);
  } catch (error) {
    contenedor.innerHTML = `<p>Error al cargar médicos: ${error.message}</p>`;
  }
}

function renderizarMedicos(lista) {
  const contenedor = document.getElementById("listaMedicos");
  contenedor.innerHTML = "";

  const verificados = lista.filter(m => m.verificado);
  const pendientes = lista.filter(m => !m.verificado);

  const crearCard = (med, incluirBoton = false) => {
    const card = document.createElement("details");
    card.className = "lab-card";

    const summary = document.createElement("summary");
    summary.innerHTML = `<strong>${med.nombre}</strong>`;
    card.appendChild(summary);

    const contenido = document.createElement("div");
    contenido.innerHTML = `
      <p><strong>Correo:</strong> ${med.correo}</p>
      <p><strong>Cédula:</strong> ${med.cedula || "No especificada"}</p>
      <p><strong>Especialidad:</strong> ${med.especialidad || "No especificada"}</p>
      <p><strong>Fecha de registro:</strong> ${med.fechaRegistro?.toDate().toLocaleString() || "N/D"}</p>
    `;

    if (incluirBoton) {
      const btn = document.createElement("button");
      btn.innerText = "Verificar médico";
      btn.onclick = async () => {
        await updateDoc(doc(db, "medicos", med.id), {
          verificado: true
        });
        alert("Médico verificado correctamente.");
        cargarMedicos();
      };
      contenido.appendChild(btn);
    }

    const btnSuspender = document.createElement("button");
    btnSuspender.innerText = med.suspendido ? "Reactivar médico" : "Suspender médico";
    btnSuspender.style.marginTop = "10px";
    btnSuspender.onclick = async () => {
      const confirmar = confirm(`¿Estás seguro que deseas ${med.suspendido ? "reactivar" : "suspender"} al médico?`);
      if (!confirmar) return;

      await updateDoc(doc(db, "medicos", med.id), {
        suspendido: !med.suspendido
      });
      alert(`Médico ${med.suspendido ? "reactivado" : "suspendido"} correctamente.`);
      cargarMedicos();
    };
    contenido.appendChild(btnSuspender);

    card.appendChild(contenido);
    return card;
  };

  const bloqueVerificados = document.createElement("div");
  bloqueVerificados.innerHTML = `<h3>✅ Médicos verificados</h3>`;
  verificados.forEach(med => bloqueVerificados.appendChild(crearCard(med)));

  const bloquePendientes = document.createElement("div");
  bloquePendientes.innerHTML = `<h3>⏳ En espera de verificación</h3>`;
  pendientes.forEach(med => bloquePendientes.appendChild(crearCard(med, true)));

  contenedor.appendChild(bloquePendientes);
  contenedor.appendChild(bloqueVerificados);
}

function filtrarMedicos(e) {
  const texto = e.target.value.toLowerCase();
  const filtrados = medicosGlobal.filter(m =>
    m.nombre.toLowerCase().includes(texto) ||
    (m.especialidad || "").toLowerCase().includes(texto)
  );
  renderizarMedicos(filtrados);
}

