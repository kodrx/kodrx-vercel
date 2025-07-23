import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
    const medicoRef = doc(db, "medicos", user.uid);
    const medicoSnap = await getDoc(medicoRef);

    if (!medicoSnap.exists()) {
      await signOut(auth);
      window.location.href = "/suspendido.html";
      return;
    }

    const data = medicoSnap.data();

    if (data.suspendido === true) {
      await signOut(auth);
      window.location.href = "/suspendido.html";
      return;
    }

    if (data.verificado !== true) {
      alert("Tu cuenta aún no ha sido verificada. Por favor espera la aprobación del administrador.");
      window.location.href = "/medico/espera_verificacion.html";
      return;
    }

    let medicoNombre = data.nombre || "Desconocido";
    let medicoCedula = data.cedula || "-";
    let medicoEspecialidad = data.especialidad || "-";
    let medicoCalle = data.calle || "-";
    let medicoNumero = data.numero || "-";
    let medicoColonia = data.colonia || "-";
    let medicoMunicipio = data.municipio || "-";
    let medicoEstado = data.estado || "-";
    let medicoCP = data.cp || "-";

    document.getElementById("generarRecetaForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const boton = e.submitter;
      boton.disabled = true;
      boton.textContent = "Generando receta...";

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

document.getElementById("btnAgregar").addEventListener("click", agregarMedicamento);
agregarMedicamento();
cargarMedicamentos();

document.getElementById("generarRecetaForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const edad = document.getElementById("edad").value;
  const observaciones = document.getElementById("observaciones").value;
  const medicamentos = obtenerMedicamentos(); // Asegúrate de tener esta función definida

  const docRef = await addDoc(collection(db, "recetas"), {
    nombrePaciente: nombre,
    edad,
    observaciones,
    medicamentos,
    timestamp: serverTimestamp(),
    correo: localStorage.getItem("kodrx_email")
  });

  console.log("✅ Receta guardada:", docRef.id);
});