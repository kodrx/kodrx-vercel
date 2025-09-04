
import { auth } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

console.log("[INICIO] panelLaboratorio-debug.js dinámico cargado");

const laboratoriosDemo = {
  "jorge@pfizer.com": {
    nombre: "Pfizer México S.A. de C.V.",
    medicamentos: 18,
    topMedicamento: "Amoxicilina 500mg",
    topMedico: "Dra. Fernanda López",
    topEstado: "Estado de México",
    recetas: 264,
    surtidas: 212,
    ranking: [
      "Amoxicilina 500mg - 120 recetas",
      "Paracetamol 750mg - 85 recetas",
      "Ibuprofeno 400mg - 72 recetas",
      "Loratadina 10mg - 61 recetas",
      "Omeprazol 20mg - 58 recetas"
    ]
  },
  "carlos@roche.com": {
    nombre: "Roche Diagnóstica",
    medicamentos: 12,
    topMedicamento: "Metformina 850mg",
    topMedico: "Dr. Rodrigo Márquez",
    topEstado: "Jalisco",
    recetas: 98,
    surtidas: 87,
    ranking: [
      "Metformina 850mg - 40 recetas",
      "Glibenclamida 5mg - 25 recetas",
      "Atorvastatina 20mg - 20 recetas",
      "Lansoprazol 30mg - 13 recetas"
    ]
  }
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/laboratorio/login.html";
    return;
  }

  const correo = user.email;
  console.log("[AUTH] Usuario laboratorio autenticado:", correo);

  const datos = laboratoriosDemo[correo];
  if (!datos) {
    document.body.innerHTML = "<main class='seccion'><h2>Acceso denegado</h2><p>Tu cuenta no está vinculada a un laboratorio activo.</p></main>";
    return;
  }

  // Cargar datos al DOM
  document.getElementById("nombreLab").textContent = datos.nombre;
  document.getElementById("totalMedicamentos").textContent = datos.medicamentos;
  document.getElementById("topMedicamento").textContent = datos.topMedicamento;
  document.getElementById("topMedico").textContent = datos.topMedico;
  document.getElementById("topEstado").textContent = datos.topEstado;
  document.getElementById("totalRecetas").textContent = datos.recetas;
  document.getElementById("totalSurtidas").textContent = datos.surtidas;

  const rankingList = document.getElementById("rankingMedicamentos");
  rankingList.innerHTML = "";
  datos.ranking.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    rankingList.appendChild(li);
  });
});
