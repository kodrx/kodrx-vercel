// /acceso.js
import { auth } from "/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --------- Helpers de URL y flujo ----------
const qs   = new URLSearchParams(location.search);
const role = (qs.get("role") || "medico").toLowerCase(); // medico | farmacia
const ret  = qs.get("return") || "";
const msg  = qs.get("msg") || "";

const DEFAULT_DEST = {
  medico: "/medico/panel.html",
  farmacia: "/farmacia/panel.html",
};

function go(dest){ location.href = dest; }

function selectRoleTab(r){
  const tabMed = document.getElementById("tabMedico");
  const tabFar = document.getElementById("tabFarmacia");
  const panMed = document.getElementById("panelMedico");
  const panFar = document.getElementById("panelFarmacia");

  // Si hay tabs, simula click; si no, muestra/oculta paneles
  if (r === "farmacia") {
    if (tabFar) tabFar.click();
    if (panMed && panFar){ panMed.style.display = "none"; panFar.style.display = "block"; }
  } else {
    if (tabMed) tabMed.click();
    if (panMed && panFar){ panMed.style.display = "block"; panFar.style.display = "none"; }
  }
}

function showMsg(text){
  const box = document.getElementById("accessMsg");
  if (box) {
    box.textContent = text;
    box.style.display = "block";
  } else {
    console.info("[ACCESO]", text);
  }
}

// --------- Mensaje opcional (logout, etc.) ----------
if (msg === "logout_ok") {
  showMsg("Sesión cerrada correctamente.");
}

// --------- Guard: si ya está logueado, redirige ----------
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Si ya está dentro y vino a /acceso, lo mandamos a donde corresponde
    const dest = ret || DEFAULT_DEST[role] || DEFAULT_DEST.medico;
    go(dest);
  }
});

// --------- Selección de pestaña al cargar ----------
document.addEventListener("DOMContentLoaded", () => {
  // Selecciona la pestaña correcta según ?role=
  selectRoleTab(role);

  // Manejo de formularios (email/pass) — ajusta IDs si usas otros
  const formMed = document.getElementById("formMedico");
  const formFar = document.getElementById("formFarmacia");

  if (formMed) {
    formMed.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (document.getElementById("medicoEmail")?.value || "").trim();
      const pass  = (document.getElementById("medicoPass")?.value  || "").trim();
      if (!email || !pass) return showMsg("Completa correo y contraseña.");
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        const dest = ret || DEFAULT_DEST.medico;
        go(dest);
      } catch (err) {
        console.error("Login médico:", err);
        showMsg("No se pudo iniciar sesión. Verifica tus datos.");
      }
    });
  }

  if (formFar) {
    formFar.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (document.getElementById("farmaciaEmail")?.value || "").trim();
      const pass  = (document.getElementById("farmaciaPass")?.value  || "").trim();
      if (!email || !pass) return showMsg("Completa correo y contraseña.");
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        const dest = ret || DEFAULT_DEST.farmacia;
        go(dest);
      } catch (err) {
        console.error("Login farmacia:", err);
        showMsg("No se pudo iniciar sesión. Verifica tus datos.");
      }
    });
  }
});
