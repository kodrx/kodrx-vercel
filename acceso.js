// /acceso.js — Login + redirección por rol real + banners + UX loading
import { auth, db } from "/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Estado UI (solo visual)
let currentRole = (urlRole === "farmacia") ? "farmacia" : "medico";
// Evitar doble redirect (race entre onAuth y submit)
let isManualRedirect = false;

// ---------- BANNERS ----------
function showMsg(text, kind = "info"){
  const box = document.getElementById("accessMsg");
  if (!box) return;
  box.textContent = text;
  box.style.display = "block";
  box.setAttribute("role", "alert");
  box.setAttribute("aria-live", "polite");
  box.classList.remove("ok","warn","error","info");
  box.classList.add(kind);
}

function hydrateMsgFromParam(){
  const map = {
    logout_ok:   { text: "Sesión cerrada correctamente.", kind: "ok" },
    suspendido:  { text: "Tu cuenta está suspendida. Contacta al soporte.", kind: "warn" },
    sin_permiso: { text: "No tienes permisos para esta sección.", kind: "warn" },
    error_guard: { text: "No pudimos validar tu sesión. Inicia sesión nuevamente.", kind: "error" },
    cred:        { text: "Correo o contraseña incorrectos.", kind: "error" },
    expired:     { text: "Tu sesión expiró. Vuelve a iniciar sesión.", kind: "info" },
  };
  const cfg = map[msg];
  if (cfg) showMsg(cfg.text, cfg.kind);
}

// ---------- UI helpers ----------
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

function focusFirstInput(panelId){
  const first = document.querySelector(`#${panelId} input`);
  if (first) first.focus();
}

// Loading / anti-doble submit
function setLoading(formEl, isLoading){
  const btn = formEl.querySelector('.btn.primary');
  const controls = formEl.querySelectorAll('input, button, select, textarea');
  controls.forEach(el => el.disabled = isLoading);
  if (btn){
    if (isLoading){
      btn.dataset.prev = btn.textContent;
      btn.textContent = "Entrando…";
      btn.classList.add('loading'); // acceso.css añade spinner con ::after
    }else{
      btn.textContent = btn.dataset.prev || "Entrar";
      btn.classList.remove('loading');
    }
  }
}

// ---------- Rol real desde Firestore ----------
async function determineRole(uid){
  try{
    const m = await getDoc(doc(db, "medicos", uid));
    if (m.exists()){
      const estado = (m.data().estado || "").toLowerCase();
      if (estado === "suspendido") return "suspendido";
      return "medico";
    }
  }catch(e){ console.warn("[ACCESO] Error medicos/{uid}:", e); }

  try{
    const f = await getDoc(doc(db, "farmacias", uid));
    if (f.exists()){
      const estado = (f.data().estado || "").toLowerCase();
      if (estado === "suspendido") return "suspendido";
      return "farmacia";
    }
  }catch(e){ console.warn("[ACCESO] Error farmacias/{uid}:", e); }

  return "desconocido";
}

// Permite return solo si corresponde al área del rol real
function allowedFor(role, urlStr){
  try{
    const p = new URL(urlStr, location.origin).pathname;
    if (role === "medico")   return p.startsWith("/medico/");
    if (role === "farmacia") return p.startsWith("/farmacia/");
    return false;
  }catch{ return false; }
}

// ---------- Guard: sesión existente → redirige por ROL REAL ----------
onAuthStateChanged(auth, async (user) => {
  if (user && !isManualRedirect) {
    const realRole = await determineRole(user.uid);
    console.log("[ACCESO] onAuth: realRole =", realRole);

    if (realRole === "suspendido") { showMsg("Tu cuenta está suspendida. Contacta al soporte.", "warn"); return; }
    if (realRole === "desconocido") { showMsg("No se encontró rol asociado a tu cuenta.", "warn"); return; }

    const dest = (ret && allowedFor(realRole, ret)) ? ret : DEFAULT_DEST[realRole];
    go(dest);
  }
});

// ---------- UI + Login ----------
document.addEventListener("DOMContentLoaded", () => {
  hydrateMsgFromParam();

  // Pestaña inicial por ?role=
  selectRoleTab(urlRole);
  focusFirstInput(currentRole === "medico" ? "panelMedico" : "panelFarmacia");

  // Cambiar pestañas (solo UI + foco)
  document.getElementById("tabMedico")?.addEventListener("click", () => { selectRoleTab("medico");   focusFirstInput("panelMedico"); });
  document.getElementById("tabFarmacia")?.addEventListener("click", () => { selectRoleTab("farmacia"); focusFirstInput("panelFarmacia"); });

  // Mostrar/Ocultar contraseña
  document.querySelectorAll(".pass .toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      if (input) input.type = input.type === "password" ? "text" : "password";
    });
  });

  // Formularios
  const formMed = document.getElementById("formMedico");
  const formFar = document.getElementById("formFarmacia");

  // Login MÉDICO
  formMed?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formMed.dataset.busy === "1") return;   // anti doble submit
    const email = document.getElementById("medicoEmail")?.value.trim();
    const pass  = document.getElementById("medicoPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.", "warn");

    try {
      formMed.dataset.busy = "1"; setLoading(formMed, true);
      isManualRedirect = true;
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const realRole = await determineRole(cred.user.uid);
      if (realRole !== "medico") {
        isManualRedirect = false;
        showMsg("Tu cuenta no es de médico. Cambia a la pestaña correcta.", "warn");
        return;
      }
      go((ret && allowedFor("medico", ret)) ? ret : DEFAULT_DEST.medico);
    } catch (err) {
      isManualRedirect = false;
      console.error("Login médico:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.", "error");
    } finally {
      formMed.dataset.busy = "0"; setLoading(formMed, false);
    }
  });

  // Login FARMACIA
  formFar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formFar.dataset.busy === "1") return;   // anti doble submit
    const email = document.getElementById("farmaciaEmail")?.value.trim();
    const pass  = document.getElementById("farmaciaPass")?.value.trim();
    if (!email || !pass) return showMsg("Completa correo y contraseña.", "warn");

    try {
      formFar.dataset.busy = "1"; setLoading(formFar, true);
      isManualRedirect = true;
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const realRole = await determineRole(cred.user.uid);
      if (realRole !== "farmacia") {
        isManualRedirect = false;
        showMsg("Esta cuenta no es de farmacia. Cambia a la pestaña de Médico si corresponde.", "warn");
        return;
      }
      go((ret && allowedFor("farmacia", ret)) ? ret : DEFAULT_DEST.farmacia);
    } catch (err) {
      isManualRedirect = false;
      console.error("Login farmacia:", err);
      showMsg("No se pudo iniciar sesión. Verifica tus datos.", "error");
    } finally {
      formFar.dataset.busy = "0"; setLoading(formFar, false);
    }
  });
});
