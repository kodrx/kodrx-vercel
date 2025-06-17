import { auth, db } from "../firebase-init.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where
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

    lista.innerHTML = "";

    for (const docSnap of querySnapshot.docs) {
      const lab = docSnap.data();
      const labDiv = document.createElement("div");
      labDiv.className = "lab-card";

      labDiv.innerHTML = `
        <strong>${lab.nombre}</strong><br>
        Contacto: ${lab.contacto}<br>
        Correo: ${lab.correo}<br>
        Teléfono: ${lab.telefono}<br>
        Ubicación: ${lab.ubicacion || "No especificada"}<br>
        Registrado: ${lab.fechaRegistro?.toDate().toLocaleString() || "N/D"}
      `;

      const btnGenerar = document.createElement("button");
      btnGenerar.innerText = "Generar link de invitación";
      btnGenerar.style.marginTop = "10px";

      btnGenerar.onclick = async () => {
        const tokenId = crypto.randomUUID();
        const link = `https://kodrx.app/laboratorio/crear-password.html?token=${tokenId}`;
        const docRef = doc(db, "laboratoriosPendientes", tokenId);

        await setDoc(docRef, {
          correo: lab.correo,
          estado: "pendiente",
          creado: new Date().toISOString(),
          link: link
        });

        mostrarLink(link, labDiv);
      };

      // Verificar si ya tiene link activo
      const q = query(
        collection(db, "laboratoriosPendientes"),
        where("correo", "==", lab.correo),
        where("estado", "==", "pendiente")
      );
      const pendientes = await getDocs(q);

      if (!pendientes.empty) {
        const docPendiente = pendientes.docs[0].data();
        mostrarLink(docPendiente.link, labDiv);
      } else {
        labDiv.appendChild(btnGenerar);
      }

      lista.appendChild(labDiv);
    }
  } catch (error) {
    lista.innerHTML = `<p>Error al cargar laboratorios: ${error.message}</p>`;
  }
}

function mostrarLink(link, contenedor) {
  const resultadoDiv = document.createElement("div");
  resultadoDiv.style.marginTop = "10px";
  resultadoDiv.style.padding = "10px";
  resultadoDiv.style.border = "1px solid #ccc";
  resultadoDiv.style.borderRadius = "6px";
  resultadoDiv.style.backgroundColor = "#f9f9f9";

  const input = document.createElement("input");
  input.type = "text";
  input.value = link;
  input.readOnly = true;
  input.style.width = "100%";
  input.style.marginBottom = "5px";
  input.style.padding = "8px";

  const btnCopiar = document.createElement("button");
  btnCopiar.innerText = "Copiar enlace";
  btnCopiar.onclick = () => {
    navigator.clipboard.writeText(link).then(() => {
      btnCopiar.innerText = "¡Copiado!";
      setTimeout(() => (btnCopiar.innerText = "Copiar enlace"), 2000);
    });
  };

  resultadoDiv.appendChild(input);
  resultadoDiv.appendChild(btnCopiar);
  contenedor.appendChild(resultadoDiv);
}
