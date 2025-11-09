// registroMedico.js — validación fuerte + UX estable
import { auth, db } from "../firebase-init.js";
import {
  createUserWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  setDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- refs
const f   = document.getElementById("formRegistroMedico");
const btn = document.getElementById("btnRegistrar");
const $   = (id) => document.getElementById(id);

// --- helpers UI de error por campo ---
function ensureErrorNode(inputEl){
  let err = inputEl.closest(".campo")?.querySelector(".field-error");
  if(!err){
    err = document.createElement("div");
    err.className = "field-error";
    // intenta insertar después del input
    inputEl.insertAdjacentElement?.("afterend", err);
  }
  return err;
}
function setFieldError(inputId, msg){
  const el = $(inputId);
  if(!el) return;
  const node = ensureErrorNode(el);
  if(msg){
    node.textContent = msg;
    node.style.display = "block";
    el.classList.add("is-invalid");
  }else{
    node.textContent = "";
    node.style.display = "none";
    el.classList.remove("is-invalid");
  }
}

// --- sanitizar teléfono: solo dígitos, máx 10 ---
const tel = $("telefono");
if (tel){
  tel.addEventListener("input", () => {
    const digits = tel.value.replace(/\D+/g, "").slice(0,10);
    tel.value = digits;
  });
}

// --- validadores ---
const rules = {
  nombre      : { test:v=>v.trim().length>1,      msg:"Nombre requerido." },
  correo      : { test:v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg:"Correo inválido." },
  password    : { test:v=>v.length>=6,            msg:"Mínimo 6 caracteres." },
  cedula      : { test:v=>v.trim().length>3,      msg:"Cédula requerida." },
  telefono    : { test:v=>/^\d{10}$/.test(v),     msg:"Teléfono de 10 dígitos." },
  calle       : { test:v=>v.trim().length>0,      msg:"Calle requerida." },
  numero      : { test:v=>v.trim().length>0,      msg:"Número requerido." },
  colonia     : { test:v=>v.trim().length>0,      msg:"Colonia requerida." },
  municipio   : { test:v=>v.trim().length>0,      msg:"Municipio requerido." },
  estado      : { test:v=>v.trim().length>0,      msg:"Estado requerido." },
  cp          : { test:v=>v.trim().length>0,      msg:"CP requerido." },
  // especialidad es opcional; si la quieres obligatoria, dale regla aquí
};

function validateField(id){
  const el = $(id);
  if(!el) return true;
  const { test, msg } = rules[id] || {};
  if(!test) { setFieldError(id, ""); return true; }
  const ok = !!test(el.value || "");
  setFieldError(id, ok ? "" : msg);
  return ok;
}

function validateForm(){
  let allOk = true;
  let firstBad = null;
  for (const id of Object.keys(rules)){
    const ok = validateField(id);
    if(!ok && !firstBad) firstBad = id;
    allOk = allOk && ok;
  }
  btn.disabled = !allOk;
  return { ok: allOk, firstBad };
}

// --- validación en tiempo real ---
for (const id of Object.keys(rules)){
  const el = $(id);
  if(!el) continue;
  el.addEventListener("input", validateForm);
  el.addEventListener("blur",  ()=>validateField(id));
}
validateForm();

// --- submit robusto ---
f.addEventListener("submit", async (ev)=>{
  ev.preventDefault();

  const { ok, firstBad } = validateForm();
  if(!ok){
    if(firstBad) $(firstBad).focus();
    alert("Faltan datos o hay errores. Revisa los campos marcados en rojo.");
    return;
  }

  // lock UI
  const oldTxt = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Registrando…";

  try{
    const nombre   = $("nombre").value.trim();
    const correo   = $("correo").value.trim().toLowerCase();
    const password = $("password").value;
    const cedula   = $("cedula").value.trim();
    const telefono = $("telefono").value.trim();

    const calle    = $("calle").value.trim();
    const numero   = $("numero").value.trim();
    const colonia  = $("colonia").value.trim();
    const municipio= $("municipio").value.trim();
    const estado   = $("estado").value.trim();
    const cp       = $("cp").value.trim();
    const especialidad = ($("especialidad")?.value || "").trim();

    // 1) Auth
    const { user } = await createUserWithEmailAndPassword(auth, correo, password);
    await updateProfile(user, { displayName: nombre });

    // 2) Firestore (defaults seguros)
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
      // defaults iniciales:
      estadoCuenta: "suspendido",
      suspendido: true,
      correoVerificado: false,
      verificado: false
    });

    alert("Cuenta creada. En breve un administrador activará y verificará tu cuenta.");
    window.location.href = "/espera_verificacion.html";
  }catch(e){
    console.error(e);
    // muestra error global y re-activa botón
    alert("No se pudo registrar: " + (e?.message || e));
    btn.disabled = false;
    btn.textContent = oldTxt;
  }
});
