// /medico/registroMedico.js — v20250921e (SDK 12.2.1)
import { auth, db } from "/firebase-init.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  deleteUser,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

console.log("[REG] cargado");
auth.languageCode = "es";

let SUBMITTING = false;
window.addEventListener("error", (e)=> console.error("[REG][window.error]", e?.message||e));
window.addEventListener("unhandledrejection", (e)=> console.error("[REG][unhandled]", e?.reason||e));

// Espera a que Auth termine su bootstrap (rehidratación de sesión, etc.)
function waitAuthReady() {
  return new Promise(resolve => {
    const off = onAuthStateChanged(auth, () => { off(); resolve(); });
  });
}
// Timeout helper
const withTimeout = (p, ms, label) => Promise.race([
  p, new Promise((_,rej)=> setTimeout(()=> rej(new Error(`TIMEOUT_${label}`)), ms))
]);

function init(){
  const form = document.getElementById("formRegistro") || document.querySelector("form");
  const btn  = document.getElementById("btnRegistro") || form?.querySelector("button");
  if (!form){ console.error("[REG] No hay <form>"); return; }
  if (btn) btn.type = "submit";
  form.addEventListener("submit", onSubmit);
  console.log("[REG] bindings OK");
}

async function onSubmit(e){
  e.preventDefault();
  if (SUBMITTING) return;
  SUBMITTING = true;

  const form = e.currentTarget;
  const btn  = document.getElementById("btnRegistro") || form.querySelector("button[type=submit]");
  const prevTxt = btn?.textContent;
  if (btn){ btn.disabled = true; btn.textContent = "Registrando…"; }

  const normTitle = s => (s||"").trim().toLowerCase().replace(/\s+/g," ").replace(/(^|\s)\S/g, m=>m.toUpperCase());
  const normEmail = s => (s||"").trim().toLowerCase();
  const normPhone = s => (s||"").replace(/\D/g,"").slice(-10);
  const normCed   = s => (s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  const buildDom  = d => `${d.calle||""} ${d.numero||""}, ${d.colonia||""}, ${d.municipio||""}, ${d.estado||""}, CP ${(d.cp||"").replace(/\D/g,"").slice(0,5)}`
                        .replace(/\s+,/g,",").replace(/,\s*,/g,", ").replace(/\s{2,}/g," ").trim();

  const ids = ["nombre","especialidad","correo","telefono","cedula","calle","numero","colonia","municipio","estado","cp","password"];
  const v = {};
  for (const id of ids){
    const el = document.getElementById(id);
    if (!el){ alert(`Falta el campo '${id}'`); return reset(); }
    v[id] = (el.value||"").trim();
  }

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

  let cred = null;
  let step = "INIT";
  const watchdog = setInterval(()=> console.warn(`[REG][watchdog] at ${step}…`), 10000);

  try{
    // 0) Asegura Auth listo
    step = "AUTH_READY";
    await withTimeout(waitAuthReady(), 8000, "AUTH_READY");

    // 1) Crear usuario con timeout
    step = "STEP1:createUser";
    console.log("[REG] STEP1: creando usuario…");
    cred = await withTimeout(
      createUserWithEmailAndPassword(auth, v.correo, v.password),
      12000,
      "CREATE_USER"
    );
    console.log("[REG] STEP1 OK uid=", cred.user?.uid);

    // 2) Índice de cédula (create-only)
    step = "STEP2:claim-cedula";
    await setDoc(doc(db, "indices_cedulas", cedNorm), {
      uid: cred.user.uid, email: v.correo, telefono: tel, createdAt: serverTimestamp()
    }, { merge: false });

    // 3) Perfil
    step = "STEP3:perfil";
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

    // 4) Verificación (best-effort)
    step = "STEP4:email";
    try{
      await sendEmailVerification(cred.user, { url: `${location.origin}/medico/espera_verificacion.html`, handleCodeInApp: false });
    }catch(e){ console.warn("[REG] email verif WARN:", e?.message||e); }

    alert("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
    location.href = "/medico/espera_verificacion.html";

  }catch(err){
    console.error("[REG] ERROR:", err?.message||err);
    if (String(err?.message||"").startsWith("TIMEOUT_CREATE_USER")){
      alert("No pudimos contactar el servicio de autenticación.\n\nRevisa:\n• Conexión de red\n• Que el dominio (kodrx.app / www.kodrx.app) esté en Authentication > Authorized domains\n• Que la API Key corresponda al proyecto correcto\n• Desactiva adblock para identitytoolkit.googleapis.com y securetoken.googleapis.com");
    } else if (String(err?.message||"").startsWith("TIMEOUT_AUTH_READY")){
      alert("El inicio de Auth tardó demasiado. Recarga la página (Ctrl/Cmd+Shift+R) o borra la sesión con window.kodrxAuthReset().");
    } else if (err?.code === "permission-denied"){
      alert("Permisos insuficientes al guardar datos. Revisa tus reglas de /medicos y /indices_cedulas.");
    } else if (err?.code === "auth/unauthorized-domain"){
      alert("Dominio no autorizado en Firebase Authentication. Agrega kodrx.app (y www.kodrx.app) en Authorized domains.");
    } else if (err?.code === "auth/email-already-in-use"){
      alert("Ese correo ya está registrado.");
    } else if (err?.code){
      alert(`Error de autenticación: ${err.code}`);
    } else {
      alert("No se pudo completar el registro. Intenta de nuevo.");
    }

    // Rollback si llegó a crearse el usuario pero falló después
    try{ if (cred?.user) await deleteUser(cred.user); }catch{}
    try{ await signOut(auth); }catch{}
  } finally {
    clearInterval(watchdog);
    SUBMITTING = false;
    if (btn){ btn.disabled = false; btn.textContent = (prevTxt||"Registrarme"); }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once:true });
} else {
  init();
}

