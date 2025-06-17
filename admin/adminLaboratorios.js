// adminLaboratorios.js
import { auth, db } from "../firebase-init.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Protección de acceso
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/admin/login.html";
  } else {
    cargarLaboratorios();
  }
});

// Registro de nuevo laboratorio
const form = document.getElementById("formLab");
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const contacto = document.getElementById("contacto").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const ubicacion = document.getElementById("ubicacion").value.trim();

  try {
    await addDoc(collection(db, "laboratorios"), {
      nombre,
      contacto,
      correo,
      telefono,
      ubicacion,
      verificado: true,
      fechaRegistro: serverTimestamp()
    });

    alert("Laboratorio registrado con éxito.");
    form.reset();
    cargarLaboratorios();
  } catch (error) {
    alert("Error al registrar laboratorio: " + error.message);
  }
});

// Mostrar lista de laboratorios
async function cargarLaboratorios() {
  const lista = document.getElementById("listaLabs");
  lista.innerHTML = "Cargando...";

  try {
    const querySnapshot = await getDocs(collection(db, "laboratorios"));
    if (querySnapshot.empty) {
      lista.innerHTML = "<p>No hay laboratorios registrados.</p>";
      return;
    }

    let html = "";
    querySnapshot.forEach((doc) => {
      const lab = doc.data();
      html += `
        <div class="lab-card">
          <strong>${lab.nombre}</strong><br>
          Contacto: ${lab.contacto}<br>
          Correo: ${lab.correo}<br>
          Teléfono: ${lab.telefono}<br>
          Ubicación: ${lab.ubicacion || "No especificada"}<br>
          Registrado: ${lab.fechaRegistro?.toDate().toLocaleString() || "N/D"}
        </div>
      `;
    });

    lista.innerHTML = html;
  } catch (error) {
    lista.innerHTML = `<p>Error al cargar laboratorios: ${error.message}</p>`;
  }
}
