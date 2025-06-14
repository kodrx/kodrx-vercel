
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { firebaseConfig } from "/firebase-init.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("No has iniciado sesión");
    window.location.href = "login.html";
    return;
  }

  const q = query(collection(db, "recetas"), where("uid", "==", user.uid));
  const querySnapshot = await getDocs(q);

  const contenedor = document.getElementById("recetasContainer");

  if (querySnapshot.empty) {
    contenedor.innerHTML = "<p>No se encontraron recetas</p>";
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
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
});
