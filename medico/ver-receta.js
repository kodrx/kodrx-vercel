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
console.log("✅ Receta encontrada:", receta);

const fecha = receta.timestamp?.toDate().toLocaleString() || "Sin fecha";

// 🔗 Buscar bloque
const resp = await fetch("https://kodrx-blockchain.onrender.com/blockchain");
const cadena = await resp.json();
const bloque = cadena.find(b => b.data?.receta?.includes(receta.medicamentos?.[0]?.nombre));

const hash = bloque?.hash || "N/A";
const index = bloque?.index || "N/A";

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

console.log("🔗 Generando QR para ID blockchain:", index);
if (index !== "N/A") {

  const titulo1 = document.createElement("p");
titulo1.textContent = "🧱 Verificación Blockchain";
document.getElementById("qr").appendChild(titulo1);
  // 🧾 QR Blockchain (valida integridad)
const canvasBlockchain = document.createElement("canvas");
document.getElementById("qr").appendChild(canvasBlockchain);
QRCode.toCanvas(canvasBlockchain, `https://kodrx-blockchain.onrender.com/verificar.html?id=${index}`, { width: 200 }, function (error) {
  if (error) console.error(error);
  console.log("📦 QR Blockchain generado");
});
const titulo2 = document.createElement("p");
titulo2.textContent = "💊 Validación y surtido";
document.getElementById("qr").appendChild(titulo2);
// 💊 QR Firebase (para que farmacias surtan)
const canvasFirebase = document.createElement("canvas");
canvasFirebase.style.marginTop = "20px";
document.getElementById("qr").appendChild(canvasFirebase);
QRCode.toCanvas(canvasFirebase, `https://www.kodrx.app/verificar.html?id=${recetaId}`, { width: 200 }, function (error) {
  if (error) console.error(error);
  console.log("💊 QR Firebase generado");
});


}


    } catch (err) {
    contenido.innerHTML = "<p>⚠️ Error al cargar receta.</p>";
    console.error(err);
  }
}); // ← 🔒 Cierre correcto de DOMContentLoaded

// ✂️ Función para acortar nombre del médico
function abreviarNombre(nombreCompleto) {
  const partes = nombreCompleto.split(" ");
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[1].charAt(0)}.`;
}
