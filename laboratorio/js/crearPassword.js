import { auth, db } from "/firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
const estadoDiv = document.getElementById("estado");
const form = document.getElementById("form-password");

if (!token) {
  mostrarError("Token inválido o no proporcionado.");
} else {
  const docRef = doc(db, "laboratoriosPendientes", token);
  getDoc(docRef).then(async (docSnap) => {
    if (!docSnap.exists()) {
      window.location.href = "/laboratorio/error-token.html";
      return;
    }

    const data = docSnap.data();
    if (data.estado !== "pendiente") {
      window.location.href = "/laboratorio/error-token.html";
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
        await createUserWithEmailAndPassword(auth, data.correo, password);

        // Aquí marcamos el token como USADO
        await updateDoc(docRef, {
          estado: "usado",
          usadoEn: new Date().toISOString()
        });

        // Mensaje visual
        form.style.display = "none";
        estadoDiv.style.display = "block";
        estadoDiv.style.backgroundColor = "#d4edda";
        estadoDiv.style.color = "#155724";
        estadoDiv.style.border = "1px solid #c3e6cb";
        estadoDiv.innerText = "¡Contraseña creada exitosamente! Redirigiendo al login...";

        setTimeout(() => {
          window.location.href = "/laboratorio/login.html";
        }, 3000);
      } catch (error) {
        console.error(error);
        alert("Error al crear la cuenta: " + error.message);
      }
    });
  });
}

function mostrarError(mensaje) {
  estadoDiv.style.display = "block";
  estadoDiv.style.backgroundColor = "#f8d7da";
  estadoDiv.style.color = "#721c24";
  estadoDiv.style.border = "1px solid #f5c6cb";
  estadoDiv.innerText = mensaje;
}
