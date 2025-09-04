// 🔝 IMPORTS
import { db, auth } from "/firebase-init.js";
import { collection, addDoc, updateDoc, getDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


// =========================
// Utils
// =========================

// 3 primeras letras del PRIMER token del nombre (sin acentos/ruido)
function iniciales3(nombre = "") {
  const s = (nombre || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")   // sin acentos
    .toUpperCase();
  // toma el primer token que tenga letras, quita números/unidades
  const token = s.replace(/[^A-Z0-9\s]/g, " ").split(/\s+/).find(t => /[A-Z]/.test(t)) || "";
  const letters = token.replace(/[^A-Z]/g, "");
  return letters.slice(0, 3) || "MED";
}


//  Verificar sesión activa
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("⚠️ No hay sesión, redirigiendo al login...");
    window.location.href = "/acceso.html";
  } else {
    console.log(" Sesión activa:", user.email || user.uid);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  console.log(" DOM cargado");

  // 🔘 Botón logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await signOut(auth);
        console.log(" Sesión cerrada correctamente");
        window.location.href = "/acceso.html?role=medico&msg=logout_ok";
      } catch (err) {
        console.error(" Error al cerrar sesión:", err);
        alert("Hubo un problema al cerrar sesión, intenta de nuevo.");
      }
    });
  }

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnGenerar = document.querySelector("button[type='submit']");
    btnGenerar.disabled = true;
    const prevTxt = btnGenerar.textContent;
    btnGenerar.textContent = "Generando…";
    console.log("📤 Enviando receta...");

    try {
      // Datos del paciente
      const nombrePaciente = document.getElementById("nombrePaciente").value.trim();
      const edad          = document.getElementById("edad").value.trim();
      const observaciones = document.getElementById("observaciones").value.trim();
      const diagnostico   = document.getElementById("diagnostico")?.value.trim() || "";
      const peso          = document.getElementById("peso")?.value.trim() || "";
      const talla         = document.getElementById("talla")?.value.trim() || "";
      const imc           = document.getElementById("imc")?.value.trim() || "";
      const presion       = document.getElementById("presion")?.value.trim() || "";
      const temperatura   = document.getElementById("temperatura")?.value.trim() || "";
      const sexo          = document.getElementById("sexo")?.value.trim() || "";

      // Datos del médico
      const user = auth.currentUser;
      const uid  = user.uid;
      const medicoDoc = doc(db, "medicos", uid);
      const medicoSnap = await getDoc(medicoDoc);

      if (!medicoSnap.exists()) {
        throw new Error("Médico no encontrado en base de datos.");
      }
      const medico = medicoSnap.data();

// Tratamiento ( con iniciales) — filtra filas vacías
const medicamentos = [];
document.querySelectorAll(".medicamento").forEach(med => {
  const nombre   = med.querySelector(".nombre").value.trim();
  const dosis    = med.querySelector(".dosis").value.trim();
  const duracion = med.querySelector(".duracion").value.trim();
  const ini      = iniciales3(nombre);   // 👈 ahora 3 letras
  medicamentos.push({ nombre, dosis, duracion, ini });
});


      // Receta base
      const recetaRef = await addDoc(collection(db, "recetas"), {
        nombrePaciente,
        edad,
        observaciones,
        diagnostico,
        peso,
        talla,
        imc,
        presion,
        temperatura,
        sexo,
        medicamentos, // ahora incluye {ini}
        medicoNombre: medico.nombre,
        medicoCedula: medico.cedula,
        medicoEspecialidad: medico.especialidad || "General",
        medicoTelefono: medico.telefono || "",
        medicoDomicilio: `${medico.calle || ""} ${medico.numero || ""}, ${medico.colonia || ""}, ${medico.municipio || ""}, ${medico.estado || ""}, CP ${medico.cp || ""}`,
        correo: user.email,
        timestamp: Timestamp.now()
      });

      console.log(" Receta guardada con ID:", recetaRef.id);


// Enviar receta a blockchain (vía proxy /api/bloques en Vercel)
try {
  const recetaResumen = medicamentos
    .map(m => `${m.nombre} ${m.dosis} por ${m.duracion}`)
    .join(", ");

  const payload = {
    receta: recetaResumen,
    medico: medico.nombre,
    cedula: medico.cedula,
    medicamentos,
    iniciales: medicamentos.map(m => m.ini),
    idReceta: recetaRef.id
  };

  console.log("[BC][payload]", payload);

  const resp = await fetch("/api/bloques", {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // no pongas Authorization aquí
    body: JSON.stringify(payload)
  });

  const raw = await resp.json().catch(() => ({}));
  console.log("[BC][raw]", raw);

  // Parseo robusto
  const num = x => (typeof x === "number" ? x : (/^\d+$/.test(x) ? Number(x) : NaN));
  const idx = [raw?.bloque?.index, raw?.index, raw?.bloqueIndex].map(num).find(Number.isFinite);
  const hsh = raw?.bloque?.hash || raw?.hash || raw?.blockHash || null;

  if (resp.ok && Number.isFinite(idx) && hsh) {
    await updateDoc(doc(db, "recetas", recetaRef.id), { bloque: idx, hash: hsh });
    console.log(" Guardado en receta:", { bloque: idx, hash: hsh });
  } else {
    console.warn("⚠ Respuesta BC sin index/hash numérico.", { idx, hsh, raw });
    if (raw?.url || raw?.consultaUrl) {
      await updateDoc(doc(db, "recetas", recetaRef.id), { urlBlockchain: raw.url || raw.consultaUrl });
    }
  }
} catch (blockErr) {
  console.error(" Error de conexión con blockchain:", blockErr?.message || blockErr);
}


      // 🎯 QR + redirect
      const qrUrl = `/medico/ver-receta.html?id=${recetaRef.id}`;
      const qrContainer = document.getElementById("qrContainer");
      if (qrContainer) {
        qrContainer.innerHTML = "";
        new QRCode(qrContainer, { text: qrUrl, width: 128, height: 128 });
      }

      btnGenerar.disabled = false;
      btnGenerar.textContent = prevTxt;
      setTimeout(() => { window.location.href = qrUrl; }, 3000);

    } catch (error) {
      console.error(" Error al guardar la receta:", error);
      alert("No se pudo generar la receta. Revisa los campos e intenta de nuevo.");
      // reactivar botón
      const btnGenerar = document.querySelector("button[type='submit']");
      if (btnGenerar) { btnGenerar.disabled = false; btnGenerar.textContent = "Generar receta"; }
    }
  });

  function agregarMedicamento() {
    const div = document.createElement("div");
    div.classList.add("medicamento");
    div.style.position = "relative";

    const inputNombre = document.createElement("input");
    inputNombre.type = "text";
    inputNombre.classList.add("nombre");
    inputNombre.placeholder = "Nombre del medicamento";

    const inputDosis = document.createElement("input");
    inputDosis.type = "text";
    inputDosis.classList.add("dosis");
    inputDosis.placeholder = "Dosis";

    const inputDuracion = document.createElement("input");
    inputDuracion.type = "text";
    inputDuracion.classList.add("duracion");
    inputDuracion.placeholder = "Duración";

    const btnEliminar = document.createElement("button");
    btnEliminar.textContent = "🗑️";
    btnEliminar.style.marginLeft = "8px";
    btnEliminar.onclick = () => div.remove();

    div.appendChild(inputNombre);
    div.appendChild(inputDosis);
    div.appendChild(inputDuracion);
    div.appendChild(btnEliminar);

    medicamentosContainer.appendChild(div);

    // 🧠 Esperamos un frame completo para insertar el autocompletado
    setTimeout(() => {
      iniciarAutocompletado(inputNombre);
    }, 100);
  }

});


