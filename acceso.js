// /acceso.js — redirección robusta por ROL REAL (Firestore)
import { auth, db } from "/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------- Query params -------
const qs      = new URLSearchParams(location.search);
const urlRole = (qs.get("role") || "medico").toLowerCase();   // "medico" | "farmacia"
const ret     = qs.get("return") || "";
const msg     = qs.get("msg") || "";

// Destinos por defecto
const DEFAULT_DEST = {
  medico:   "/medico/panel.html",
  farmacia: "/farmacia/panel.html",
};
const go = (dest) => { console.log("[ACCESO] →", dest); location.href = dest; };

// Estado de UI (solo visual)
let currentRole = (urlRole === "farmacia") ? "farmacia" : "medico";
// Para evitar doble redirect (race entre onAuth y submit)
let isManualRedirect = false;

// ---------- Helpers ----------
function showMsg(text){
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
  if (panM && panF){ panM.hidden = !isMed; panF.hidden = isMed; }
  console.log("[ACCESO] currentRole(UI) =", currentRole);
}

// Determina el ROL REAL del usuario desde Firestore
async function determineRole(uid){
  // 1) ¿Es médico?
  try{
    const m = await getDoc(doc(db, "medicos", uid));
    if (m.exists()){
      const estado = (m.data().estado || "").toLowerCase();
      if (estado === "suspendido"){
        showMsg("Tu cuenta de médico está suspendida.");
        return "suspendido";
      }
      return "medico";
    }
  }catch(e){ console.warn("[ACCESO] Error leyendo medicos/{uid}:", e); }

  // 2) ¿Es farmacia?
  try{
    const f = await getDoc(doc(db, "farmacias", uid));
    if (f.exists()){
      const estado = (f.data().estado || "").toLowerCase();
      if (estado === "suspendido"){
        showMsg("La cuenta de farmacia está suspendida.");
        return "suspendido";
      }
      return "farmacia";
    }
  }catch(e){ console.warn("[ACCESO] Error leyendo farmacias/{uid}:", e); }

  return "desconocido";
}

// Solo permite return hacia el área del rol real
function allowedFor(role, urlStr){
  try{
    const p = new URL(urlStr, location.origin).pathname;
    if (role === "medico")   return p.startsWith("/medico/");
    if (role === "farmacia") return p.startsWith("/farmacia/");
    return false;
  }catch{ return false; }
}

// ---------- Mensaje post-logout ----------
if (msg === "logout_ok") {
  window.addEventListener("DOMContentLoaded", () => showMsg("Sesión cerrada correctamente."));
}

// ---------- Guard: si ya hay sesión, redirige por ROL REAL ----------
onAuthStateChanged(auth, async (user) => {
  if (user && !isManualRedirect) {
    const realRole = await determineRole(user.uid);
    console.log("[ACCESO] onAuth: realRole =", realRole);

    if (realRole === "suspendido") return; // se quedó en la página con el mensaje
    if (realRole === "desconocido") {
      showMsg("No se encontró rol asociado a tu cuenta.");
      return;
    }

    // Respeta return SOLO si coincide con el área del rol real
    const dest = (ret && allowedFor(realRole, ret)) ? ret : DEFAULT_DEST[realRole];
    go(dest);
  }
});

// ---------- UI y login ----------
document.addEventListener("DOMContentLoaded", () => {
  // Pestaña inicial según ?role=
  selectRoleTab(urlRole);

  // Cambios de pestaña (solo UI)
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

  // Login MÉDICO
  formMed?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("medicoEmail")?.value.trim();
    const pass  = document.getElementById("medicoPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.");

    try {
      isManualRedirect = true;
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const realRole = await determineRole(cred.user.uid);
      if (realRole !== "medico") {
        showMsg("Tu cuenta no es de médico. Revisa la pestaña correcta.");
        isManualRedirect = false;
        return;
      }
      go((ret && allowedFor("medico", ret)) ? ret : DEFAULT_DEST.medico);
    } catch (err) {
      isManualRedirect = false;
      console.error("Login médico:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.");
    }
  });

  // Login FARMACIA
  formFar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("farmaciaEmail")?.value.trim();
    const pass  = document.getElementById("farmaciaPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.");

    try {
      isManualRedirect = true;
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const realRole = await determineRole(cred.user.uid);
      if (realRole !== "farmacia") {
        showMsg("Esta cuenta no es de farmacia. Cambia a la pestaña de Médico si corresponde.");
        isManualRedirect = false;
        return;
      }
      go((ret && allowedFor("farmacia", ret)) ? ret : DEFAULT_DEST.farmacia);
    } catch (err) {
      isManualRedirect = false;
      console.error("Login farmacia:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.");
    }
  });
});
