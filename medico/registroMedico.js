// /medico/registroMedico.js — v20250921d (SDK 12.2.1)
import { auth, db } from "/firebase-init.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

console.log("[REG] cargado");

auth.languageCode = "es";

// Mutex global anti-doble submit
let SUBMITTING = false;

// Errores globales a consola (por si algo explota silencioso)
window.addEventListener("error", (e)=> console.error("[REG][window.error]", e?.message||e));
window.addEventListener("unhandledrejection", (e)=> console.error("[REG][unhandled]", e?.reason||e));

function init(){
  // Form + botón
  const form = document.getElementById("formRegistro") || document.querySelector("form");
  const btn  = document.getElementById("btnRegistro") || form?.querySelector("button");

  if (!form){ console.error("[REG] No encontré <form> (#formRegistro)"); return; }
  if (btn) btn.type = "submit"; // un solo flujo: submit del form

  form.addEventListener("submit", onSubmit);
  console.log("[REG] bindings OK");
}

async function onSubmit(e){
  e.preventDefault();
  if (SUBMITTING) return; // evita doble
  SUBMITTING = true;

  const form = e.currentTarget;
  const btn  = document.getElementById("btnRegistro") || form.querySelector("button[type=submit]");
  const prevTxt = btn?.textContent;
  if (btn){ btn.disabled = true; btn.textContent = "Registrando…"; }

  // Utilidades
  const normTitle = s => (s||"").trim().toLowerCase().replace(/\s+/g," ").replace(/(^|\s)\S/g, m=>m.toUpperCase());
  const normEmail = s => (s||"").trim().toLowerCase();
  const normPhone = s => (s||"").replace(/\D/g,"").slice(-10);
  const normCed   = s => (s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  const buildDom  = d => `${d.calle||""} ${d.numero||""}, ${d.colonia||""}, ${d.municipio||""}, ${d.estado||""}, CP ${(d.cp||"").replace(/\D/g,"").slice(0,5)}`
                        .replace(/\s+,/g,",").replace(/,\s*,/g,", ").replace(/\s{2,}/g," ").trim();

  // Lee campos
  const ids = ["nombre","especialidad","correo","telefono","cedula","calle","numero","colonia","municipio","estado","cp","password"];
  const v = {};
  for (const id of ids){
    const el = document.getElementById(id);
    if (!el){ alert(`Falta el campo '${id}'`); return reset(); }
    v[id] = (el.value||"").trim();
  }

  // Normaliza + valida
  v.nombre       = normTitle(v.nombre);
  v.especialidad = normTitle(v.especialidad || "General");
  v.correo       = normEmail(v.correo);
  const tel      = normPhone(v.telefono);
  const cp5      = (v.cp||"").replace(/\D/g,"").slice(0,5);
  const cedNorm  = normCed(v.cedula);
  const domicilio= buildDom(v);
  const searchName = v.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  if (!v.nombre || !v.especialidad || !v.correo || !v.password){ alert("Completa todos los campos."); return reset(); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo)){ alert("Correo no válido."); return reset(); }
  if (v.password.length < 8){ alert("La contraseña debe tener al menos 8 caracteres."); return reset(); }
  if (tel.length !== 10){ alert("El teléfono debe tener 10 dígitos (MX)."); return reset(); }
  if (cp5.length !== 5){ alert("El código postal debe tener 5 dígitos."); return reset(); }
  if (!cedNorm){ alert("Cédula no válida."); return reset(); }

  // Watchdog (10s) por paso para diagnosticar “colgados”
  let step = "INIT";
  const watchdog = setInterval(()=> console.warn(`[REG][watchdog] at ${step}…`), 10000);

  let cred = null;
  try{
    step = "STEP1:createUser";
    console.log("[REG] STEP1: creando usuario…");
    cred = await createUserWithEmailAndPassword(auth, v.correo, v.password);
    console.log("[REG] STEP1 OK uid=", cred.user?.uid);

    step = "STEP2:claim-cedula";
    console.log("[REG] STEP2: reclamando cédula", cedNorm);
    try{
      await setDoc(doc(db, "indices_cedulas", cedNorm), {
        uid: cred.user.uid, email: v.correo, telefono: tel, createdAt: serverTimestamp()
      }, { merge: false });
      console.log("[REG] STEP2 OK");
    }catch(e){
      console.warn("[REG] STEP2 FAIL (cédula tomada o permiso):", e?.code||e);
      try{ await deleteUser(cred.user); }catch{}
      try{ await signOut(auth); }catch{}
      alert("La cédula ya está registrada. No se creó la cuenta.");
      return reset();
    }

    step = "STEP3:perfil";
    console.log("[REG] STEP3: creando perfil…");
    await setDoc(doc(db, "medicos", cred.user.uid), {
      uid: cred.user.uid,
      nombre: v.nombre,
      displayName: v.nombre,
      searchName,
      especialidad: v.especialidad,
      correo: v.correo,
      telefono: tel,
      cedula: cedNorm,
      calle: v.calle, numero: v.numero, colonia: v.colonia,
      municipio: v.municipio, estado: v.estado, cp: cp5,
      medicoDomicilio: domicilio,
      estadoCuenta: "activo",
      verificado: false,
      correoVerificado: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log("[REG] STEP3 OK");

    step = "STEP4:email";
    console.log("[REG] STEP4: enviando verificación…");
    try{
      await sendEmailVerification(cred.user, {
        url: `${location.origin}/medico/espera_verificacion.html`,
        handleCodeInApp: false
      });
      console.log("[REG] STEP4 OK (email enviado)");
    }catch(e){
      console.warn("[REG] STEP4 WARN (no se pudo enviar verificación):", e?.message||e);
    }

    alert("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
    location.href = "/medico/espera_verificacion.html";

  }catch(err){
    console.error("[REG] ERROR:", err?.code, err?.message);
    const code = err?.code || "";
    if (code === "auth/email-already-in-use")      alert("Ese correo ya está registrado.");
    else if (code === "auth/invalid-email")        alert("Correo inválido.");
    else if (code === "auth/weak-password")        alert("La contraseña es muy débil.");
    else                                           alert("No se pudo completar el registro. Inténtalo de nuevo.");
    reset();
  } finally {
    clearInterval(watchdog);
  }

  function reset(){
    SUBMITTING = false;
    if (btn){ btn.disabled = false; btn.textContent = (prevTxt||"Registrarme"); }
  }
}

// Init robusto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once:true });
} else {
  init();
}

