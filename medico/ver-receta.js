import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  projectId: "kodrx-105b9"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const recetaId = params.get("id");
  const contenido = document.getElementById("contenido");

  if (!recetaId) {
    contenido.innerHTML = "<p>❌ No se proporcionó ID de receta.</p>";
    return;
  }

  try {
    // 🔍 Obtener receta desde Firestore
    const docRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      contenido.innerHTML = "<p>❌ Receta no encontrada.</p>";
      return;
    }

    const receta = docSnap.data();
    const fecha = receta.timestamp?.toDate().toLocaleString() || "Sin fecha";

    // 🔗 Buscar el último bloque (opcional, podrías usar también solo el ID blockchain si se guarda)
    const resp = await fetch("https://kodrx-blockchain.onrender.com/blockchain");
    const cadena = await resp.json();
    const bloque = cadena.find(b => b.data?.receta?.includes(receta.medicamentos?.[0]?.nombre));

    const hash = bloque?.hash || "N/A";
    const index = bloque?.index || "N/A";

    // 🧠 Mostrar datos
    contenido.innerHTML = `
      <p><strong>📅 Fecha:</strong> ${fecha}</p>
      <p><strong>👨‍⚕️ Médico:</strong> ${abreviarNombre(receta.medicoNombre)}</p>
      <p><strong>🧪 Medicamentos:</strong></p>
      <ul>
        ${receta.medicamentos.map(m => `<li>${m.nombre} ${m.dosis} por ${m.duracion}</li>`).join("")}
      </ul>
      <p><strong>🔗 ID Blockchain:</strong> ${index}</p>
      <p><strong>🧬 Hash:</strong> <code>${hash}</code></p>
    `;

    // 🎯 Generar QR para validación pública
    const qr = new QRious({
      element: document.getElementById("qr"),
      value: `https://kodrx-blockchain.onrender.com/verificar.html?id=${index}`,
      size: 200
    });

  } catch (err) {
    contenido.innerHTML = "<p>⚠️ Error al cargar receta.</p>";
    console.error(err);
  }
});

// ✂️ Función para acortar nombre del médico
function abreviarNombre(nombreCompleto) {
  const partes = nombreCompleto.split(" ");
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[1].charAt(0)}.`;
}
