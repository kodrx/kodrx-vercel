import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { firebaseConfig } from "/firebase-config.js"; // Asegúrate de tener este archivo

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
const estadoDiv = document.getElementById("estado");
const form = document.getElementById("form-password");

if (!token) {
  estadoDiv.innerText = "Token inválido o no proporcionado.";
} else {
  const docRef = doc(db, "laboratoriosPendientes", token);
  getDoc(docRef).then(async (docSnap) => {
    if (!docSnap.exists()) {
      estadoDiv.innerText = "Este enlace ha expirado o ya fue usado.";
      return;
    }

    const data = docSnap.data();
    if (data.estado !== "pendiente") {
      estadoDiv.innerText = "Este enlace ya fue utilizado.";
      return;
    }

    form.style.display = "block";

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const password = document.getElementById("password").value;
      const confirm = document.getElementById("confirm-password").value;

      if (password !== confirm) {
        alert("Las contraseñas no coinciden.");
        return;
      }

      try {
        const userCred = await createUserWithEmailAndPassword(auth, data.correo, password);

        // Marcar como activo o eliminar documento temporal
        await deleteDoc(docRef); // o updateDoc(docRef, { estado: "activo" })

        estadoDiv.style.display = "block";
estadoDiv.style.backgroundColor = "#d4edda";
estadoDiv.style.color = "#155724";
estadoDiv.style.border = "1px solid #c3e6cb";
estadoDiv.innerText = "¡Contraseña creada exitosamente! Redirigiendo al login...";
form.style.display = "none";

setTimeout(() => {
  window.location.href = "/laboratorio/login.html";
}, 3000);

      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al crear la cuenta: " + error.message);
      }
    });
  });
}
