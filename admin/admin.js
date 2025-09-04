
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { auth } from "../firebase-init.js";

const adminEmail = "admin@kodrx.app";

window.loginAdmin = function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      if (user.email === adminEmail) {
        sessionStorage.setItem("adminLoggedIn", "true");
        window.location.href = "/admin/admin.html";
      } else {
        error.textContent = "No tienes permisos de administrador.";
      }
    })
    .catch((err) => {
      error.textContent = "Correo o contraseña incorrectos.";
    });
};
