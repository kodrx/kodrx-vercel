// 🔝 IMPORTS
import { db, auth } from "/firebase-init.js";
import { collection, addDoc, updateDoc, getDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


// =========================
// Utils
// =========================

// Iniciales del medicamento (sin acentos, ignora stopwords/unidades, hasta 4 letras)
function inicialesMedicamento(nombre = "") {
  let s = (nombre || "")
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')        // sin acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s\/\-\+]/g, ' ');                   // limpia símbolos raros

  const stop = new Set([
    'DE','DEL','LA','EL','LOS','LAS','CON','Y','PARA',
    'MG','ML','MCG','G','GR','XR','SR','DR','HRS','TAB','CAP','SOL','SUSP','INJ'
  ]);

  const tokens = s.split(/[\s\-\/\+]+/).filter(Boolean);
  const letras = tokens
    .filter(t => !stop.has(t) && !/^\d+/.test(t))
    .map(t => t[0]);

  const ini = letras.slice(0, 4).join('');
  return ini || (tokens[0]?.[0] || 'M');
}


// 🔒 Verificar sesión activa
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("⚠️ No hay sesión, redirigiendo al login...");
    window.location.href = "/acceso.html";
  } else {
    console.log("✅ Sesión activa:", user.email || user.uid);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  // 🔘 Botón logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await signOut(auth);
        console.log("👋 Sesión cerrada correctamente");
        window.location.href = "/acceso.html?role=medico&msg=logout_ok";
      } catch (err) {
        console.error("❌ Error al cerrar sesión:", err);
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

      // Tratamiento (💊 con iniciales)
      const medicamentos = [];
      document.querySelectorAll(".medicamento").forEach(med => {
        const nombre   = med.querySelector(".nombre").value.trim();
        const dosis    = med.querySelector(".dosis").value.trim();
        const duracion = med.querySelector(".duracion").value.trim();
        const ini      = inicialesMedicamento(nombre);
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

      console.log("✅ Receta guardada con ID:", recetaRef.id);

// 📦 Enviar receta a blockchain (compat + campos nuevos, mapeo robusto)
try {
  const recetaResumen = medicamentos
    .map(m => `${m.nombre} ${m.dosis} por ${m.duracion}`)
    .join(", ");

  const payload = {
    // Compat
    receta: recetaResumen,
    medico: medico.nombre,
    cedula: medico.cedula,
    // Nuevos (tu backend puede ignorarlos sin romper)
    medicamentos,
    iniciales: medicamentos.map(m => m.ini),
    // (Opcional) ayuda para trazabilidad del lado servidor
    idReceta: recetaRef.id
  };

  const resp = await fetch("https://kodrx-blockchain.onrender.com/bloques", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer kodrx-secret-2025"
    },
    body: JSON.stringify(payload)
  });

  const raw = await resp.json().catch(() => ({}));
  console.log("[BC][raw]", raw);

  // Helpers de parseo seguro
  const num = (x) => {
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string" && /^\d+$/.test(x)) return Number(x);
    return null;
  };
  const pickIndex = (...cands) => cands.map(num).find(v => Number.isFinite(v)) ?? null;
  const pickHash  = (...cands) => cands.find(h => typeof h === "string" && h.length >= 10) ?? null;

  // Intentamos las formas más comunes
  const idx = pickIndex(
    raw?.bloque?.index,
    raw?.block?.index,
    raw?.index,
    raw?.bloqueIndex
    // ❌ JAMÁS uses recetaRef.id como fallback aquí
  );
  const hsh = pickHash(
    raw?.bloque?.hash,
    raw?.block?.hash,
    raw?.hash,
    raw?.blockHash
  );

  if (resp.ok && Number.isFinite(idx) && hsh) {
    await updateDoc(doc(db, "recetas", recetaRef.id), { bloque: idx, hash: hsh });
    console.log("✅ Guardado en receta:", { bloque: idx, hash: hsh });
  } else {
    console.warn("⚠️ Respuesta BC sin index/hash numérico. No se actualiza la receta.", { idx, hsh, raw });
    // (Opcional) guarda un URL de consulta si tu backend lo entrega
    if (raw?.url || raw?.consultaUrl) {
      await updateDoc(doc(db, "recetas", recetaRef.id), { urlBlockchain: raw.url || raw.consultaUrl });
    }
  }
} catch (blockErr) {
  console.error("❌ Error de conexión con blockchain:", blockErr?.message || blockErr);
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
      console.error("❌ Error al guardar la receta:", error);
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


