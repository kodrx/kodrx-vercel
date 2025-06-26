import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

  if (!recetaId) return;

  try {
    const docRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const receta = docSnap.data();
    document.getElementById("fecha").textContent = receta.timestamp?.toDate().toLocaleString() || "Sin fecha";
    document.getElementById("medico").textContent = receta.medicoNombre || "-";
    document.getElementById("cedula").textContent = receta.medicoCedula || "-";
    document.getElementById("especialidad").textContent = receta.medicoEspecialidad || "-";


    const cadenaResp = await fetch("https://kodrx-blockchain.onrender.com/blockchain");
    const cadena = await cadenaResp.json();
    const bloque = cadena.find(b => b.data?.receta?.includes(receta.medicamentos?.[0]?.nombre));

    const hash = bloque?.hash || "N/A";
    const index = bloque?.index || "N/A";
    document.getElementById("hash").textContent = hash;

    new QRious({
      element: document.getElementById("qrFirebase"),
      value: `https://www.kodrx.app/verificar.html?id=${recetaId}`,
      size: 220
    });

    new QRious({
      element: document.getElementById("qrBlockchain"),
      value: `https://kodrx-blockchain.onrender.com/verificar.html?id=${index}`,
      size: 120
    });

    // Descargar como imagen
    document.getElementById("descargar").addEventListener("click", () => {
      html2canvas(document.querySelector(".receta-container"), { scale: 2 }).then(canvas => {
        const link = document.createElement("a");
        link.download = `receta-kodrx-${recetaId}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    });

  } catch (error) {
    document.body.innerHTML = "<p style='text-align:center;color:red;'>❌ Error al cargar la receta.</p>";
  }
});
