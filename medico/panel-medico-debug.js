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
      const sexo = document.getElementById("sexo").value;
      const peso = parseFloat(document.getElementById("peso").value);
      const talla = parseFloat(document.getElementById("talla").value);
      const temperatura = document.getElementById("temperatura").value;
      const presion = document.getElementById("presion").value;
      const diagnostico = document.getElementById("diagnostico").value;

      let imc = "-";
      if (peso > 0 && talla > 0) {
        imc = (peso / Math.pow(talla / 100, 2)).toFixed(2);
      }

      const medicamentos = obtenerMedicamentos();

      const medicoRef = doc(db, "medicos", user.uid);
      const medicoSnap = await getDoc(medicoRef);

      let medicoNombre = "Desconocido";
      let medicoCedula = "-";
      let medicoEspecialidad = "-";

      // 📦 Datos de domicilio del médico
      let medicoCalle = "-";
      let medicoNumero = "-";
      let medicoColonia = "-";
      let medicoMunicipio = "-";
      let medicoEstado = "-";
      let medicoCP = "-";

      if (medicoSnap.exists()) {
        const data = medicoSnap.data();
        medicoNombre = data.nombre || "Desconocido";
        medicoCedula = data.cedula || "-";
        medicoEspecialidad = data.especialidad || "-";
        medicoCalle = data.calle || "-";
        medicoNumero = data.numero || "-";
        medicoColonia = data.colonia || "-";
        medicoMunicipio = data.municipio || "-";
        medicoEstado = data.estado || "-";
        medicoCP = data.cp || "-";
      }

      try {
        const docRef = await addDoc(collection(db, "recetas"), {
          uid: user.uid,
          medicoNombre,
          medicoCedula,
          medicoEspecialidad,
          medicoCalle,
          medicoNumero,
          medicoColonia,
          medicoMunicipio,
          medicoEstado,
          medicoCP,
          nombrePaciente: nombre,
          edad,
          sexo: sexo || "No registrado",
          peso: peso || "-",
          talla: talla || "-",
          imc: imc || "-",
          presion: presion || "-",
          temperatura: temperatura || "-",
          diagnostico: diagnostico || "-",
          observaciones,
          medicamentos,
          timestamp: serverTimestamp()
        });

        const recetaId = docRef.id;

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
              cedula: medicoCedula
            })
          });

          const blockchainData = await blockchainResp.json();

          if (blockchainResp.ok) {
            console.log("✅ Receta registrada en blockchain. ID:", blockchainData.bloque.index);
          } else {
            console.warn("⚠️ Blockchain falló:", blockchainData.error);
          }

        } catch (error) {
          console.error("❌ Error de conexión con blockchain:", error.message);
        }

        window.location.href = `/medico/ver-receta.html?id=${recetaId}`;

      } catch (error) {
        console.error("❌ Error al guardar la receta:", error);
      }
    });
  }
});

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
