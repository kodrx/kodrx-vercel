
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  databaseURL: "https://kodrx-105b9-default-rtdb.firebaseio.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.appspot.com",
  messagingSenderId: "239675098141",
  appId: "1:239675098141:web:152ae3741b0ac79db7f2f4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    document.getElementById("generarRecetaForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre").value;
      const edad = document.getElementById("edad").value;
      const observaciones = document.getElementById("observaciones").value;
      const medicamentos = obtenerMedicamentos();

      const medicoRef = doc(db, "medicos", user.uid);
      const medicoSnap = await getDoc(medicoRef);
      const medicoNombre = medicoSnap.exists() ? medicoSnap.data().nombre : "Desconocido";

      try {
        const docRef = await addDoc(collection(db, "recetas"), {
          uid: user.uid,
          medicoNombre,
          nombrePaciente: nombre,
          edad,
          observaciones,
          medicamentos,
          timestamp: serverTimestamp()
        });

        const recetaId = docRef.id;
        generarQR(recetaId);

        // 🔗 Encadenamiento en blockchain
        try {
          const blockchainResp = await fetch("https://kodrx-blockchain.onrender.com/bloques", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer kodrx-secret-2025"
            },
            body: JSON.stringify({
              receta: medicamentos.map(m => `${m.nombre} ${m.dosis} por ${m.duracion}`).join(', '),
              medico: medicoNombre,
              cedula: "00000000"
            })
          });

          const blockchainData = await blockchainResp.json();

          if (blockchainResp.ok) {
            const idBlockchain = blockchainData.bloque.index;
            console.log("✅ Receta registrada en blockchain. ID:", idBlockchain);

            // Mostrar ID en pantalla
            const qrDiv = document.getElementById("qr");
            const info = document.createElement("p");
            info.textContent = `ID Blockchain: ${idBlockchain}`;
            qrDiv.appendChild(info);
          } else {
            console.warn("⚠️ No se pudo registrar en blockchain:", blockchainData.error);
          }
        } catch (error) {
          console.error("❌ Error al conectar con blockchain:", error.message);
        }

      } catch (error) {
        console.error("Error al guardar la receta:", error);
      }
    });
  }
});

// Generador de QR
function generarQR(id) {
  const url = `https://www.kodrx.app/verificar.html?id=${id}`;
  const qrDiv = document.getElementById("qr");
  qrDiv.innerHTML = "";
  const canvas = document.createElement("canvas");
  qrDiv.appendChild(canvas);
  QRCode.toCanvas(canvas, url, { width: 200 }, function (error) {
    if (error) console.error(error);
    console.log("QR generado");
  });
}

// Obtener medicamentos de campos dinámicos
function obtenerMedicamentos() {
  const medicamentos = [];
  const contenedores = document.querySelectorAll(".medicamento");
  contenedores.forEach((container) => {
    const nombre = container.querySelector(".nombre").value;
    const dosis = container.querySelector(".dosis").value;
    const duracion = container.querySelector(".duracion").value;
    medicamentos.push({ nombre, dosis, duracion });
  });
  return medicamentos;
}

// Agregar nuevo campo de medicamento
window.agregarMedicamento = function () {
  const div = document.createElement("div");
  div.className = "medicamento";
  div.innerHTML = `
    <input class="nombre" placeholder="Nombre" list="listaMedicamentos" />
    <input class="dosis" placeholder="Dosis" />
    <input class="duracion" placeholder="Duración" />
  `;
  document.getElementById("medicamentos").appendChild(div);
  cargarMedicamentos();
};

// Cargar medicamentos en datalist
async function cargarMedicamentos() {
  try {
    const response = await fetch("medicamentos_ext.json");
    const medicamentos = await response.json();
    const datalist = document.getElementById("listaMedicamentos");
    datalist.innerHTML = "";
    medicamentos.forEach((med) => {
      const option = document.createElement("option");
      option.value = med;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar medicamentos:", error);
  }
}

// Inicial
document.getElementById("btnAgregar").addEventListener("click", agregarMedicamento);
agregarMedicamento();
cargarMedicamentos();

