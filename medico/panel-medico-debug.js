
// panel-medico-debug.js
console.log("🚀 Script activo");

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧩 DOM cargado");

  const form = document.querySelector("#generarRecetaForm");
  console.log("📝 Formulario:", form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombrePaciente = document.getElementById("nombrePaciente").value;
    const edad = document.getElementById("edadPaciente").value;
    const observaciones = document.getElementById("observaciones").value;

    const medicamentos = [];
    document.querySelectorAll(".medicamento").forEach((med) => {
      medicamentos.push({
        nombre: med.querySelector(".nombre").value,
        dosis: med.querySelector(".dosis").value,
        duracion: med.querySelector(".duracion").value,
      });
    });

    const correo = localStorage.getItem("kodrx_email") || "";
    const timestamp = new Date();

    if (!correo) {
      alert("Sesión inválida. Por favor inicia sesión nuevamente.");
      return;
    }

    try {
      const receta = {
        nombrePaciente,
        edad,
        observaciones,
        medicamentos,
        correo,
        timestamp,
      };

      const docRef = await db.collection("recetas").add(receta);

      console.log("✅ Receta guardada con ID:", docRef.id);

      // Redirigir a la vista receta completa
      window.location.href = `/medico/ver-receta.html?id=${docRef.id}`;
    } catch (error) {
      console.error("❌ Error al guardar receta:", error);
      alert("Hubo un error al guardar la receta. Intenta de nuevo.");
    }
  });
});
