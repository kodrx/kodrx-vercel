// /acceso.js
import { auth } from "/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ------- Query params -------
const qs = new URLSearchParams(location.search);
const urlRole = (qs.get("role") || "medico").toLowerCase();  // medico | farmacia
const ret     = qs.get("return") || "";
const msg     = qs.get("msg") || "";

// Destinos por defecto
const DEFAULT_DEST = {
  medico:   "/medico/panel.html",
  farmacia: "/farmacia/panel.html",
};
const go = (dest) => { console.log("[ACCESO] →", dest); location.href = dest; };

// Fuente única de verdad del rol seleccionado (inicia con el de la URL)
let currentRole = (urlRole === "farmacia" ? "farmacia" : "medico");
// Para evitar doble redirección (race entre onAuthStateChanged y submit)
let isManualRedirect = false;

function showMsg(text) {
  const box = document.getElementById("accessMsg");
  if (!box) return;
  box.textContent = text;
  box.style.display = "block";
}

function selectRoleTab(role){
  currentRole = (role === "farmacia") ? "farmacia" : "medico";
  const tabM = document.getElementById("tabMedico");
  const tabF = document.getElementById("tabFarmacia");
  const panM = document.getElementById("panelMedico");
  const panF = document.getElementById("panelFarmacia");
  const isMed = currentRole === "medico";

  tabM?.classList.toggle("active", isMed);
  tabF?.classList.toggle("active", !isMed);
  if (panM && panF){
    panM.hidden = !isMed;
    panF.hidden = isMed;
  }
  console.log("[ACCESO] currentRole =", currentRole);
}

// Mensaje amistoso post-logout
if (msg === "logout_ok") {
  window.addEventListener("DOMContentLoaded", () => showMsg("Sesión cerrada correctamente."));
}

// Si ya está logueado y aterriza en /acceso, lo mandamos al destino según pestaña/URL
onAuthStateChanged(auth, (user) => {
  if (user && !isManualRedirect) {
    const dest = ret || DEFAULT_DEST[currentRole];
    console.log("[ACCESO] onAuthStateChanged → usuario detectado. Redirigiendo a", dest);
    go(dest);
  }
});

// ------- UI y login -------
document.addEventListener("DOMContentLoaded", () => {
  // Pestaña inicial según ?role=
  selectRoleTab(urlRole);

  // Clicks de pestañas: actualizan currentRole (clave para el redirect correcto)
  document.getElementById("tabMedico")?.addEventListener("click", () => selectRoleTab("medico"));
  document.getElementById("tabFarmacia")?.addEventListener("click", () => selectRoleTab("farmacia"));

  // Mostrar/Ocultar contraseña (ambos formularios)
  document.querySelectorAll(".pass .toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // Formularios
  const formMed = document.getElementById("formMedico");
  const formFar = document.getElementById("formFarmacia");

  formMed?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("medicoEmail")?.value.trim();
    const pass  = document.getElementById("medicoPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.");
    try {
      isManualRedirect = true; // evita que onAuth redirija al rol equivocado
      await signInWithEmailAndPassword(auth, email, pass);
      go(ret || DEFAULT_DEST.medico);
    } catch (err) {
      isManualRedirect = false;
      console.error("Login médico:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.");
    }
  });

  formFar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("farmaciaEmail")?.value.trim();
    const pass  = document.getElementById("farmaciaPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.");
    try {
      isManualRedirect = true; // evita que onAuth redirija al rol equivocado
      await signInWithEmailAndPassword(auth, email, pass);
      go(ret || DEFAULT_DEST.farmacia);
    } catch (err) {
      isManualRedirect = false;
      console.error("Login farmacia:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.");
    }
  });
});
