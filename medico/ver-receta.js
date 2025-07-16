
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

  const isMobile = window.innerWidth <= 600;

  // ✅ Generar código de barras desde el ID
  JsBarcode("#barcodeCanvas", recetaId, {
    format: "CODE128",
    lineColor: "#1e88e5",
    width: isMobile ? 1.5 : 2,
    height: isMobile ? 40 : 60,
    displayValue: true,
    fontSize: isMobile ? 12 : 16,
    margin: 0
  });

  try {
    const docRef = doc(db, "recetas", recetaId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const receta = docSnap.data();

    // Mostrar datos del médico
    document.getElementById("fecha").textContent = receta.timestamp?.toDate().toLocaleString() || "Sin fecha";
    document.getElementById("medico").textContent = receta.medicoNombre || "-";
    document.getElementById("cedula").textContent = receta.medicoCedula || "-";
    document.getElementById("especialidad").textContent = receta.medicoEspecialidad || "-";

    const direccion = `${receta.medicoCalle || ''} ${receta.medicoNumero || ''}, Col. ${receta.medicoColonia || ''}, ${receta.medicoMunicipio || ''}, ${receta.medicoEstado || ''}, C.P. ${receta.medicoCP || ''}`;
    const cabecera = document.querySelector(".cabecera");
    const pDireccion = document.createElement("p");
    pDireccion.innerHTML = `<strong>Domicilio:</strong> ${direccion}`;
    cabecera.appendChild(pDireccion);

    const cadenaResp = await fetch("https://kodrx-blockchain.onrender.com/blockchain");
    const cadena = await cadenaResp.json();
    const bloque = cadena.find(b => b.data?.medico === receta.medicoNombre && b.data?.cedula === receta.medicoCedula);

    const hash = bloque?.hash || "N/A";
    const index = bloque?.index || "N/A";
    document.getElementById("hash").innerHTML = `#${index}<br>${hash}`;

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
