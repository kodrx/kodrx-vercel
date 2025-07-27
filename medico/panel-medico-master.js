
// 🚀 Script maestro activo para panel médico
import { db, auth } from "/firebase-init.js";
import { collection, addDoc, updateDoc, getDoc, doc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btnGenerar = document.querySelector("button[type='submit']");
    btnGenerar.disabled = true;
    btnGenerar.textContent = "Generando...";
    console.log("📤 Enviando receta...");

    try {
      // Datos del paciente
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

      // Datos del médico
      const user = auth.currentUser;
      const uid = user.uid;
      const medicoDoc = await doc(db, "medicos", uid);
      const medicoSnap = await getDoc(medicoDoc);

      if (!medicoSnap.exists()) {
        throw new Error("Médico no encontrado en base de datos.");
      }

      const medico = medicoSnap.data();

      // Tratamiento
      const medicamentos = [];
      document.querySelectorAll(".medicamento").forEach(med => {
        const nombre = med.querySelector(".nombre").value;
        const dosis = med.querySelector(".dosis").value;
        const duracion = med.querySelector(".duracion").value;
        medicamentos.push({ nombre, dosis, duracion });
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
        medicamentos,
        medicoNombre: medico.nombre,
        medicoCedula: medico.cedula,
        medicoEspecialidad: medico.especialidad || "General",
        medicoTelefono: medico.telefono || "",
        medicoDomicilio: `${medico.calle || ""} ${medico.numero || ""}, ${medico.colonia || ""}, ${medico.municipio || ""}, ${medico.estado || ""}, CP ${medico.cp || ""}`,
        correo: user.email,
        timestamp: Timestamp.now()
      });

      console.log("✅ Receta guardada con ID:", recetaRef.id);

      // Enviar receta a blockchain
      try {
        const blockchainResp = await fetch("https://kodrx-blockchain.onrender.com/bloques", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer kodrx-secret-2025"
          },
          body: JSON.stringify({
receta: medicamentos.map(m => `${m.nombre} ${m.dosis} por ${m.duracion}`).join(", "),

            medico: medico.nombre,
            cedula: medico.cedula
          })
        });

        const blockchainData = await blockchainResp.json();

        if (blockchainResp.ok) {
          const recetaDocRef = doc(db, "recetas", recetaRef.id);
          await updateDoc(recetaDocRef, {
            bloque: blockchainData.bloque.index,
            hash: blockchainData.bloque.hash
          });
          console.log("✅ Blockchain actualizado:", blockchainData.bloque);
        } else {
          console.warn("⚠️ Blockchain falló:", blockchainData.error);
        }
      } catch (blockErr) {
        console.error("❌ Error de conexión con blockchain:", blockErr.message);
      }

      const qrUrl = `/medico/ver-receta.html?id=${recetaRef.id}`;
      const qrContainer = document.getElementById("qrContainer");
      qrContainer.innerHTML = "";
      new QRCode(qrContainer, {
        text: qrUrl,
        width: 128,
        height: 128
      });

      btnGenerar.disabled = false;
    btnGenerar.textContent = "Generar receta";
    setTimeout(() => {
        window.location.href = qrUrl;
      }, 3000);

    } catch (error) {
      console.error("❌ Error al guardar la receta:", error);
    }
  });

  
  function agregarMedicamento() {
    const div = document.createElement("div");
    div.classList.add("medicamento");

    const inputNombre = document.createElement("input");
    inputNombre.type = "text";
    inputNombre.classList.add("nombre");
    inputNombre.placeholder = "Nombre del medicamento";
    iniciarAutocompletado(inputNombre);

    const inputDosis = document.createElement("input");
    inputDosis.type = "text";
    inputDosis.classList.add("dosis");
    inputDosis.placeholder = "Dosis";

    const inputDuracion = document.createElement("input");
    inputDuracion.type = "text";
    inputDuracion.classList.add("duracion");
    inputDuracion.placeholder = "Duración";

    div.appendChild(inputNombre);
    div.appendChild(inputDosis);
    div.appendChild(inputDuracion);

    medicamentosContainer.appendChild(div);
    setTimeout(() => {
    iniciarAutocompletado(inputNombre);
  }, 0);
  }

});
