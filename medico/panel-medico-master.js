// 🚀 Script maestro para panel médico con UID
import { db, auth } from "/firebase-init.js";
import { collection, addDoc, Timestamp, getDoc, doc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");
  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuario no autenticado");

      const uid = user.uid;
      const medicoRef = doc(db, "medicos", uid);
      const medicoSnap = await getDoc(medicoRef);
      if (!medicoSnap.exists()) throw new Error("Datos del médico no encontrados");

      const medico = medicoSnap.data();

      const nombrePaciente = document.getElementById("nombrePaciente").value;
      const edad = document.getElementById("edad").value;
      const observaciones = document.getElementById("observaciones").value;
      const diagnostico = document.getElementById("diagnostico")?.value || "";

      const peso = document.getElementById("peso")?.value || "";
      const talla = document.getElementById("talla")?.value || "";
      const imc = document.getElementById("imc")?.value || "";
      const presion = document.getElementById("presion")?.value || "";
      const temperatura = document.getElementById("temperatura")?.value || "";
      const sexo = document.getElementById("sexo")?.value || "";

      const medicamentos = [];
      document.querySelectorAll(".medicamento").forEach(med => {
        const nombre = med.querySelector(".nombre").value;
        const dosis = med.querySelector(".dosis").value;
        const duracion = med.querySelector(".duracion").value;
        medicamentos.push({ nombre, dosis, duracion });
      });

      // Obtener el último bloque
      const recetasRef = collection(db, "recetas");
      const q = query(recetasRef, orderBy("bloque", "desc"), limit(1));
      const snapshot = await getDocs(q);
      let ultimoBloque = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.bloque) ultimoBloque = data.bloque;
      });

      const bloque = ultimoBloque + 1;
      const hash = self.crypto?.randomUUID?.() || `HASH-${Date.now()}`;

      const recetaDoc = await addDoc(recetasRef, {
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
        medicamentos,
        medicoNombre: medico.nombre,
        medicoCedula: medico.cedula,
        medicoEspecialidad: medico.especialidad || "General",
        medicoTelefono: medico.telefono || "",
        medicoDomicilio: `${medico.calle || ""} ${medico.numero || ""}, ${medico.colonia || ""}, ${medico.municipio || ""}, ${medico.estado || ""}, CP ${medico.cp || ""}`,
        correo: user.email,
        bloque,
        hash,
        timestamp: Timestamp.now()
      });

      console.log("✅ Receta guardada con ID:", recetaDoc.id);
      const qrUrl = `/verificar.html?id=${recetaDoc.id}`;
      const qrContainer = document.getElementById("qrContainer");
      qrContainer.innerHTML = "";
      new QRCode(qrContainer, {
        text: qrUrl,
        width: 128,
        height: 128
      });

      setTimeout(() => {
        window.location.href = `/medico/ver-receta.html?id=${recetaDoc.id}`;
      }, 3000);

    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
    }
  });

  function agregarMedicamento() {
    const div = document.createElement("div");
    div.classList.add("medicamento");
    div.innerHTML = `
      <input type="text" class="nombre" placeholder="Nombre del medicamento">
      <input type="text" class="dosis" placeholder="Dosis">
      <input type="text" class="duracion" placeholder="Duración">
    `;
    medicamentosContainer.appendChild(div);
  }
});
