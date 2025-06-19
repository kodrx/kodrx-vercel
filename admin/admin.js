import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { auth } from "../firebase-init.js";

window.loginAdmin = function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      sessionStorage.setItem("adminLoggedIn", "true");
      window.location.href = "admin.html";
    })
    .catch((err) => {
      error.textContent = "Correo o contraseña incorrectos.";
    });
};
