const adminEmail = "admin@kodrx.com";
const adminPassword = "adminKodRx2025";

window.loginAdmin = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");

  if (email === adminEmail && password === adminPassword) {
    sessionStorage.setItem("adminLoggedIn", "true");
    window.location.href = "admin.html";
  } else {
    error.textContent = "Correo o contraseña incorrectos.";
  }
};
