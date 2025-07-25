// 🚀 Script maestro activo
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");
  const agregarMedicamentoBtn = document.getElementById("agregarMedicamentoBtn");

  if (!form || !medicamentosContainer || !agregarMedicamentoBtn) {
    console.error("❌ Elementos clave no encontrados en el DOM");
    return;
  }

  agregarMedicamentoBtn.addEventListener("click", () => {
    const div = document.createElement("div");
    div.classList.add("medicamento");
    div.innerHTML = `
      <input type="text" class="nombre" placeholder="Nombre del medicamento" required>
      <input type="text" class="dosis" placeholder="Dosis" required>
      <input type="text" class="duracion" placeholder="Duración" required>
    `;
    medicamentosContainer.appendChild(div);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    const nombrePaciente = document.getElementById("nombrePaciente")?.value || "";
    const edad = document.getElementById("edad")?.value || "";
    const observaciones = document.getElementById("observaciones")?.value || "";
    const correo = localStorage.getItem("kodrx_email") || "desconocido";

    const medicamentos = [];
    document.querySelectorAll(".medicamento").forEach(med => {
      const nombre = med.querySelector(".nombre")?.value || "";
      const dosis = med.querySelector(".dosis")?.value || "";
      const duracion = med.querySelector(".duracion")?.value || "";
      medicamentos.push({ nombre, dosis, duracion });
    });

    const receta = {
      nombrePaciente,
      edad,
      observaciones,
      correo,
      medicamentos,
      timestamp: new Date()
    };

    try {
      const docRef = await db.collection("recetas").add(receta);
      console.log("✅ Receta guardada con ID:", docRef.id);

      // Mostrar QR
      const qrUrl = `/medico/ver-receta.html?id=${docRef.id}`;
      const qrContainer = document.getElementById("qrContainer");
      qrContainer.innerHTML = "";
      new QRCode(qrContainer, {
        text: qrUrl,
        width: 128,
        height: 128
      });
    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
    }
  });
});
