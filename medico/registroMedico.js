import { auth, db } from "../firebase-init.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- refs
const f = document.getElementById("formRegistroMedico");
const btn = document.getElementById("btnRegistrar");

// valida en tiempo real
const inputsReq = ["nombre","correo","password","cedula","telefono","calle","numero","colonia","municipio","estado","cp"];
const g = (id)=> document.getElementById(id);

function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function isValidPhone(v){ return /^\d{10}$/.test(v); }             // 10 dígitos exactos
function nonEmpty(v){ return String(v||"").trim().length>0; }

function validateForm(){
  const ok =
    nonEmpty(g("nombre").value) &&
    isValidEmail(g("correo").value) &&
    nonEmpty(g("password").value) &&
    nonEmpty(g("cedula").value) &&
    isValidPhone(g("telefono").value) &&
    nonEmpty(g("calle").value) &&
    nonEmpty(g("numero").value) &&
    nonEmpty(g("colonia").value) &&
    nonEmpty(g("municipio").value) &&
    nonEmpty(g("estado").value) &&
    nonEmpty(g("cp").value);
  btn.disabled = !ok;
  return ok;
}

// activa/desactiva botón mientras el usuario escribe
[...inputsReq, "correo","password"].forEach(id=>{
  g(id).addEventListener("input", validateForm);
});
validateForm();

f.addEventListener("submit", async (ev)=>{
  ev.preventDefault();
  if (!validateForm()) return;

  btn.disabled = true;
  const oldTxt = btn.textContent;
  btn.textContent = "Registrando…";

  try{
    const nombre   = g("nombre").value.trim();
    const correo   = g("correo").value.trim().toLowerCase();
    const password = g("password").value;
    const cedula   = g("cedula").value.trim();
    const telefono = g("telefono").value.trim();

    const calle    = g("calle").value.trim();
    const numero   = g("numero").value.trim();
    const colonia  = g("colonia").value.trim();
    const municipio= g("municipio").value.trim();
    const estado   = g("estado").value.trim();
    const cp       = g("cp").value.trim();
    const especialidad = (g("especialidad")?.value || "").trim();

    // 1) Crea usuario Auth
    const { user } = await createUserWithEmailAndPassword(auth, correo, password);
    await updateProfile(user, { displayName: nombre });

    // 2) Doc Firestore con DEFAULTS SEGUROS (arranca suspendido y sin verificación)
    const uid = user.uid;
    const medicoDomicilio = `${calle} ${numero}, ${colonia}, ${municipio}, ${estado}, CP ${cp}`;
    await setDoc(doc(db, "medicos", uid), {
      uid, nombre, displayName:nombre, correo,
      telefono, cedula, especialidad,
      calle, numero, colonia, municipio, estado, cp,
      medicoDomicilio,
      searchName: nombre.toLowerCase(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      // --- estados por defecto:
      estadoCuenta: "suspendido",
      suspendido: true,
      correoVerificado: false,
      verificado: false
    });

    // 3) Redirige a página de espera si así lo deseas
    window.location.href = "/espera_verificacion.html";
  }catch(e){
    alert("No se pudo registrar: " + (e?.message || e));
    btn.disabled = false;
    btn.textContent = oldTxt;
    return;
  }
});

