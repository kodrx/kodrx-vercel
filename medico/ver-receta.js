
import { db } from "/firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const recetaId = params.get("id");

  if (!recetaId) {
    alert("ID de receta no especificado.");
    return;
  }

  try {
    const docRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      alert("La receta no fue encontrada.");
      return;
    }

    const receta = docSnap.data();

    // Mostrar datos en la vista
    document.getElementById("nombrePaciente").textContent = receta.nombrePaciente || "Sin nombre";
    document.getElementById("edadPaciente").textContent = receta.edad || "-";
    document.getElementById("sexoPaciente").textContent = receta.sexo || "-";
    document.getElementById("pesoPaciente").textContent = receta.peso || "-";
    document.getElementById("tallaPaciente").textContent = receta.talla || "-";
    document.getElementById("temperaturaPaciente").textContent = receta.temperatura || "-";
    document.getElementById("presionPaciente").textContent = receta.presion || "-";
    document.getElementById("imcPaciente").textContent = receta.imc || "-";
    document.getElementById("diagnosticoPaciente").textContent = receta.diagnostico || "-";
    document.getElementById("observacionesPaciente").textContent = receta.observaciones || "-";

    // Mostrar medicamentos
    const lista = document.getElementById("listaMedicamentos");
    receta.medicamentos.forEach((med, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${med.nombre} - ${med.dosis}, por ${med.duracion}`;
      lista.appendChild(li);
    });

    // Generar hash único
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(receta)));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    document.getElementById("hashReceta").textContent = hashHex;

    // QR receta
    new QRCode(document.getElementById("qrReceta"), {
      text: window.location.href,
      width: 180,
      height: 180
    });

    // QR blockchain
    new QRCode(document.getElementById("qrBlockchain"), {
      text: `https://kodrx.app/public/consulta.html?id=${recetaId}`,
      width: 100,
      height: 100
    });

  } catch (error) {
    console.error("❌ Error al cargar receta:", error);
    alert("Ocurrió un error al cargar la receta.");
  }
});
