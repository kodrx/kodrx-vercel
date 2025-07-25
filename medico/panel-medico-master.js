
document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  const medicamentosContainer = document.getElementById("medicamentosContainer");

  document.getElementById("agregarMedicamentoBtn").addEventListener("click", agregarMedicamento);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📤 Enviando receta...");

    const nombrePaciente = document.getElementById("nombrePaciente").value;
    const edad = document.getElementById("edad").value;
    const observaciones = document.getElementById("observaciones").value;

    const medicamentos = [];
    document.querySelectorAll(".medicamento").forEach(med => {
      const nombre = med.querySelector(".nombre").value;
      const dosis = med.querySelector(".dosis").value;
      const duracion = med.querySelector(".duracion").value;
      medicamentos.push({ nombre, dosis, duracion });
    });

    console.log({ nombrePaciente, edad, observaciones, medicamentos });

    // Simular guardado de receta aquí
    const qrContainer = document.getElementById("qrContainer");
    qrContainer.innerHTML = "";
    const qrUrl = "/medico/ver-receta.html?id=TEST123";
    new QRCode(qrContainer, {
      text: qrUrl,
      width: 128,
      height: 128
    });
    console.log("✅ QR generado para:", qrUrl);
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
