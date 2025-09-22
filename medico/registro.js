// /medico/registro.js (SDK 12.2.1) — robusto
import { auth, db } from "/firebase-init.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp, runTransaction, getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRegistro");
  if (!btn) { console.error("No se encontró #btnRegistro"); return; }

  btn.addEventListener("click", onSubmit);

  function resetBtn(prev){
    btn.dataset.busy = "0";
    btn.textContent = prev;
    btn.disabled = false;
  }

  function normTitle(s){ return (s||"").trim().toLowerCase().replace(/\s+/g," ")
    .replace(/(^|\s)\S/g, m=>m.toUpperCase()); }
  function normEmail(s){ return (s||"").trim().toLowerCase(); }
  function normPhoneMX(s){ return (s||"").replace(/\D/g,"").slice(-10); } // 10 dígitos
  function normCedula(s){ return (s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
  function buildDomicilio({calle,numero,colonia,municipio,estado,cp}){
    return `${calle||""} ${numero||""}, ${colonia||""}, ${municipio||""}, ${estado||""}, CP ${cp||""}`
      .replace(/\s+,/g, ",").replace(/,\s*,/g, ", ").replace(/\s{2,}/g," ").trim();
  }

  async function onSubmit(e){
    e.preventDefault();
    if (btn.dataset.busy === "1") return;
    const prev = btn.textContent; btn.textContent = "Registrando…"; btn.disabled = true; btn.dataset.busy = "1";

    const campos = ["nombre","especialidad","correo","telefono","cedula","calle","numero","colonia","municipio","estado","cp","password"];
    const datos = {};
    for (const c of campos){
      const el = document.getElementById(c);
      if (!el){ alert(`Falta el campo '${c}'`); return resetBtn(prev); }
      datos[c] = (el.value||"").trim();
    }

    // Normalizaciones
    datos.nombre        = normTitle(datos.nombre);
    datos.especialidad  = normTitle(datos.especialidad);
    datos.correo        = normEmail(datos.correo);
    const tel           = normPhoneMX(datos.telefono);
    const cp            = (datos.cp||"").replace(/\D/g,"").slice(0,5);
    const cedNorm       = normCedula(datos.cedula);

    // Validaciones rápidas
    if (!datos.nombre || !datos.especialidad || !datos.correo || !datos.password){ alert("Completa todos los campos."); return resetBtn(prev); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)){ alert("Correo no válido."); return resetBtn(prev); }
    if (datos.password.length < 8){ alert("La contraseña debe tener al menos 8 caracteres."); return resetBtn(prev); }
    if (tel.length !== 10){ alert("Teléfono debe tener 10 dígitos (MX)."); return resetBtn(prev); }
    if (cp.length !== 5){ alert("CP debe tener 5 dígitos."); return resetBtn(prev); }
    if (!cedNorm){ alert("Cédula no válida."); return resetBtn(prev); }

    
let cred = null;

try {
  // 1) Crear cuenta
  cred = await createUserWithEmailAndPassword(auth, datos.correo, datos.password);
  const uid = cred.user.uid;

  const perfRef = doc(db, "medicos", uid);
  const idxRef  = doc(db, "indices_cedulas", cedNorm);

  // 2) RECLAMAR la cédula SIN leerla (si ya existe, esta línea va a fallar con permission-denied)
  try{
    await setDoc(idxRef, {
      uid, email: datos.correo, telefono: tel, createdAt: serverTimestamp()
    }, { merge: false }); // <- crea; si ya existe, tu regla no permite update => permission-denied
  }catch(e){
    // rollback de la cuenta para no dejar Auth huérfano
    try{ await deleteUser(cred.user); }catch{}
    try{ await signOut(auth); }catch{}
    alert("La cédula ya está registrada. No se creó la cuenta.");
    return resetBtn(prev);
  }

  // 3) Crear PERFIL (el dueño tiene permiso de create en /medicos/{uid})
  await setDoc(perfRef, {
    nombre: datos.nombre,
    displayName: datos.nombre,
    searchName,
    especialidad: datos.especialidad || "General",
    correo: datos.correo,
    telefono: tel,
    cedula: cedNorm,
    calle: datos.calle, numero: datos.numero, colonia: datos.colonia,
    municipio: datos.municipio, estado: datos.estado, cp,
    medicoDomicilio,
    estadoCuenta: "activo",
    verificado: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // 4) Enviar verificación
  try{
    await sendEmailVerification(cred.user, {
      url: `${location.origin}/medico/espera_verificacion.html`,
      handleCodeInApp: false
    });
  }catch{}

  alert("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
  location.href = "/medico/espera_verificacion.html";

} catch (err) {
  console.error("[REG] Error:", err?.code, err?.message);
  const code = err?.code || "";
  if (code === "auth/email-already-in-use")      alert("Ese correo ya está registrado.");
  else if (code === "auth/invalid-email")        alert("Correo inválido.");
  else if (code === "auth/weak-password")        alert("La contraseña es muy débil.");
  else                                           alert("No se pudo completar el registro. Inténtalo de nuevo.");
} finally {
  resetBtn(prev);
}
