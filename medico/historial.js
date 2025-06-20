
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBIjaOe4HcGNDk0xrqen8etBv0RyjyOJHw",
  authDomain: "kodrx-105b9.firebaseapp.com",
  databaseURL: "https://kodrx-105b9-default-rtdb.firebaseio.com",
  projectId: "kodrx-105b9",
  storageBucket: "kodrx-105b9.appspot.com",
  messagingSenderId: "239675098141",
  appId: "1:239675098141:web:152ae3741b0ac79db7f2f4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

let recetasTotales = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("No has iniciado sesión");
    window.location.href = "login.html";
    return;
  }

const recetasRef = collection(db, "recetas");
const q = query(recetasRef, where("uid", "==", user.uid), orderBy("timestamp", "desc"));
const querySnapshot = await getDocs(q);


  if (querySnapshot.empty) {
    const contenedor = document.getElementById("recetasContainer");
    if (contenedor) {
      contenedor.innerHTML = "<p>No se encontraron recetas</p>";
    }
    return;
  }

  recetasTotales = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  mostrarRecetas(recetasTotales);
});

function mostrarRecetas(lista) {
  const contenedor = document.getElementById("recetasContainer");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  lista.forEach((data) => {
    const card = document.createElement("div");
    card.className = "receta-card";
    card.innerHTML = `
      <h3>${data.nombrePaciente || "Paciente sin nombre"}</h3>
      <p><strong>Fecha:</strong> ${data.timestamp?.toDate().toLocaleDateString()} ${data.timestamp?.toDate().toLocaleTimeString()}</p>
      <details>
        <summary>Ver detalles</summary>
        <p><strong>Edad:</strong> ${data.edad}</p>
        <p><strong>Observaciones:</strong> ${data.observaciones}</p>
        <p><strong>Medicamentos:</strong></p>
        <ul>
          ${(data.medicamentos || []).map(med => `<li>${med.nombre} - ${med.dosis} por ${med.duracion}</li>`).join("")}
        </ul>
      </details>
    `;
    contenedor.appendChild(card);
  });
}

window.filtrarRecetas = function (valor) {
  if (!valor || !recetasTotales || recetasTotales.length === 0) {
    mostrarRecetas(recetasTotales);
    return;
  }

  const texto = valor.toLowerCase();
  const filtradas = recetasTotales.filter(receta =>
    (receta.nombrePaciente || "").toLowerCase().includes(texto)
  );
  mostrarRecetas(filtradas);
}
