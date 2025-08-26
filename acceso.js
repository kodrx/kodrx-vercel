// /acceso.js
import { auth } from "/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ------- Query params -------
const qs   = new URLSearchParams(location.search);
const role = (qs.get("role") || "medico").toLowerCase(); // "medico" | "farmacia"
const ret  = qs.get("return") || "";
const msg  = qs.get("msg") || "";

// Destinos por defecto
const DEFAULT_DEST = {
  medico: "/medico/panel.html",
  farmacia: "/farmacia/panel.html",
};

function go(dest){ location.href = dest; }

function showMsg(text, kind = "info"){
  const box = document.getElementById("accessMsg");
  if (!box) return;
  box.textContent = text;
  box.style.display = "block";
  // Si quieres variar estilos por tipo, puedes añadir clases:
  // box.className = "msg " + kind;
}

function selectRoleTab(r){
  const tabM = document.getElementById("tabMedico");
  const tabF = document.getElementById("tabFarmacia");
  const panM = document.getElementById("panelMedico");
  const panF = document.getElementById("panelFarmacia");
  const isMed = r === "medico";

  tabM?.classList.toggle("active", isMed);
  tabF?.classList.toggle("active", !isMed);
  if (panM && panF){
    panM.hidden = !isMed;
    panF.hidden = isMed;
  }
}

// Mensaje post-logout (si viene ?msg=logout_ok)
if (msg === "logout_ok") {
  window.addEventListener("DOMContentLoaded", () => {
    showMsg("Sesión cerrada correctamente.", "ok");
  });
}

// Si ya está logueado y ateriza en /acceso, redirige de una
onAuthStateChanged(auth, (user) => {
  if (user) {
    const dest = ret || DEFAULT_DEST[role] || DEFAULT_DEST.medico;
    go(dest);
  }
});

// ------- UI y login -------
document.addEventListener("DOMContentLoaded", () => {
  // Pestaña inicial según ?role=
  selectRoleTab(role);

  // Clicks de pestañas
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
    if (!email || !pass) return showMsg("Completa correo y contraseña.", "warn");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      go(ret || DEFAULT_DEST.medico);
    } catch (err) {
      console.error("Login médico:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.", "error");
    }
  });

  formFar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("farmaciaEmail")?.value.trim();
    const pass  = document.getElementById("farmaciaPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.", "warn");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      go(ret || DEFAULT_DEST.farmacia);
    } catch (err) {
      console.error("Login farmacia:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.", "error");
    }
  });
});
