import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== "admin@kodrx.app") {
    window.location.href = "/admin/login.html";
  } else {
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

  const crearCard = (med, incluirBotonVerificar = false) => {
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

    // Etiquetas de estado
    if (med.suspendido) {
      const etiqueta = document.createElement("span");
      etiqueta.innerText = "🚫 Suspendido";
      etiqueta.style.color = "red";
      etiqueta.style.fontWeight = "bold";
      contenido.appendChild(etiqueta);
    } else if (med.verificado) {
      const etiqueta = document.createElement("span");
      etiqueta.innerText = "✅ Verificado";
      etiqueta.style.color = "green";
      etiqueta.style.fontWeight = "bold";
      contenido.appendChild(etiqueta);
    }

    // Botón de verificación
    if (incluirBotonVerificar) {
      const btnVerificar = document.createElement("button");
      btnVerificar.innerText = "Verificar médico";
      btnVerificar.onclick = async () => {
        await updateDoc(doc(db, "medicos", med.id), { verificado: true });
        alert("Médico verificado correctamente.");
        cargarMedicos();
      };
      contenido.appendChild(btnVerificar);
    }

    // Botón de suspender / reactivar
    if (med.verificado) {
      const btnSuspender = document.createElement("button");
      btnSuspender.innerText = med.suspendido ? "Reactivar médico" : "Suspender médico";
      btnSuspender.style.marginLeft = "10px";
      btnSuspender.onclick = async () => {
        const confirmado = confirm(`¿Seguro que deseas ${med.suspendido ? "reactivar" : "suspender"} a este médico?`);
        if (!confirmado) return;

        await updateDoc(doc(db, "medicos", med.id), {
          suspendido: !med.suspendido
        });
        alert(`Médico ${med.suspendido ? "reactivado" : "suspendido"} correctamente.`);
        cargarMedicos();
      };
      contenido.appendChild(btnSuspender);
    }
// Botón de eliminar médico
const btnEliminar = document.createElement("button");
btnEliminar.innerText = "❌ Eliminar médico";
btnEliminar.style.marginLeft = "10px";
btnEliminar.style.backgroundColor = "#e53935";
btnEliminar.style.color = "white";

btnEliminar.onclick = async () => {
  const confirmado = confirm("¿Estás seguro de eliminar este médico permanentemente?");
  if (!confirmado) return;

  try {
    await updateDoc(doc(db, "medicos", med.id), {
      eliminado: true // Marcar eliminado si prefieres lógica suave
    });
    // O eliminar completamente:
    // await deleteDoc(doc(db, "medicos", med.id));

    alert("Médico eliminado.");
    cargarMedicos();
  } catch (err) {
    alert("Error al eliminar: " + err.message);
  }
};
contenido.appendChild(btnEliminar);

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

