
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

console.log("[INICIO] adminLaboratorios-debug.js cargado correctamente");

try {
  onAuthStateChanged(auth, (user) => {
    if (user && user.email === "admin@kodrx.app") {
      console.log("[AUTH] Usuario autenticado como admin:", user.email);

      const iniciar = () => {
        console.log("[DOM] DOM listo. Iniciando cargarLaboratorios()");
        cargarLaboratorios();
        const form = document.getElementById("formLab");
        if (form) {
          console.log("[FORM] formLab encontrado");
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
        } else {
          console.error("[FORM] formLab NO encontrado");
        }
      };

      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", iniciar);
      } else {
        iniciar();
      }

    } else {
      console.warn("[AUTH] Usuario no autorizado. Redirigiendo...");
      window.location.href = "/admin/login.html";
    }
  });
} catch (error) {
  console.error("[ERROR] en ejecución principal:", error);
}

async function cargarLaboratorios() {
  const lista = document.getElementById("listaLabs");
  if (!lista) {
    console.error("[DOM] ¡Elemento #listaLabs NO encontrado!");
    return;
  }
  console.log("[LABS] Cargando laboratorios...");

  try {
    const querySnapshot = await getDocs(collection(db, "laboratorios"));
    console.log("[LABS] Documentos encontrados:", querySnapshot.size);

    if (querySnapshot.empty) {
      lista.innerHTML = "<p>No hay laboratorios registrados.</p>";
      return;
    }

    lista.innerHTML = "";

    for (const docSnap of querySnapshot.docs) {
      const lab = docSnap.data();
      const labCard = document.createElement("details");
      labCard.className = "lab-card";

      const summary = document.createElement("summary");
      summary.innerHTML = `<strong>${lab.nombre}</strong>`;
      labCard.appendChild(summary);

      const contenido = document.createElement("div");
      contenido.innerHTML = `
        <p><strong>Contacto:</strong> ${lab.contacto}</p>
        <p><strong>Correo:</strong> ${lab.correo}</p>
        <p><strong>Teléfono:</strong> ${lab.telefono}</p>
        <p><strong>Ubicación:</strong> ${lab.ubicacion || "No especificada"}</p>
        <p><strong>Registrado:</strong> ${lab.fechaRegistro?.toDate().toLocaleString() || "N/D"}</p>
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

        const etiqueta = crearEtiquetaEstado("pendiente");
        contenido.appendChild(etiqueta);
        mostrarLink(link, contenido);
      };

      const q = query(
        collection(db, "laboratoriosPendientes"),
        where("correo", "==", lab.correo)
      );
      const pendientes = await getDocs(q);

      if (!pendientes.empty) {
        const tokens = pendientes.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const tokenActivo = tokens.find(t => t.estado === "pendiente");
        const tokenUsado = tokens.find(t => t.estado === "usado");

        if (tokenActivo) {
          const creado = new Date(tokenActivo.creado);
          const ahora = new Date();
          const diferenciaHoras = (ahora - creado) / 1000 / 60 / 60;

          if (diferenciaHoras > 48) {
            await deleteDoc(doc(db, "laboratoriosPendientes", tokenActivo.id));
            const etiqueta = crearEtiquetaEstado("expirado");
            contenido.appendChild(etiqueta);
            contenido.appendChild(btnGenerar);
          } else {
            const etiqueta = crearEtiquetaEstado("pendiente");
            contenido.appendChild(etiqueta);
            mostrarLink(tokenActivo.link, contenido);
          }
        } else if (tokenUsado) {
          const etiqueta = crearEtiquetaEstado("usado");
          contenido.appendChild(etiqueta);
        } else {
          contenido.appendChild(btnGenerar);
        }

        const historialDiv = document.createElement("div");
        historialDiv.style.marginTop = "8px";
        historialDiv.innerHTML = "<strong>Historial de accesos generados:</strong><br>";

        tokens.forEach(t => {
          const item = document.createElement("div");
          item.style.fontSize = "12px";
          item.style.marginBottom = "4px";
          item.innerHTML = `📎 <code>${t.link}</code> <br><small>Estado: ${t.estado} | Creado: ${new Date(t.creado).toLocaleString()}</small>`;
          historialDiv.appendChild(item);
        });

        contenido.appendChild(historialDiv);
      } else {
        contenido.appendChild(btnGenerar);
      }

      labCard.appendChild(contenido);
      lista.appendChild(labCard);
    }
  } catch (error) {
    lista.innerHTML = `<p>Error al cargar laboratorios: ${error.message}</p>`;
    console.error("[ERROR] al cargar laboratorios:", error.message);
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

function crearEtiquetaEstado(estado) {
  const span = document.createElement("span");
  span.innerText = `Estado del link: ${estado}`;
  span.style.display = "inline-block";
  span.style.marginTop = "6px";
  span.style.padding = "4px 8px";
  span.style.borderRadius = "4px";
  span.style.fontSize = "12px";
  span.style.fontWeight = "bold";

  switch (estado) {
    case "pendiente":
      span.style.backgroundColor = "#fff3cd";
      span.style.color = "#856404";
      break;
    case "usado":
      span.style.backgroundColor = "#d4edda";
      span.style.color = "#155724";
      break;
    case "expirado":
      span.style.backgroundColor = "#f8d7da";
      span.style.color = "#721c24";
      break;
    default:
      span.style.backgroundColor = "#e2e3e5";
      span.style.color = "#6c757d";
  }

  return span;
}
