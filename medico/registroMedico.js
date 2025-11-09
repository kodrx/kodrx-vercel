// /medico/registroMedico.js — compatible con formRegistro + btnRegistro (type=submit)
import { auth, db } from "../firebase-init.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- refs según TU HTML ---
  const form = document.getElementById("formRegistro");
  const submitBtn = document.getElementById("btnRegistro");
  if (!form || !submitBtn) {
    console.error("[Registro] No encontré formRegistro o btnRegistro");
    return;
  }

  // Helper: buscar campo por id o name dentro del form
  const $f = (name) => form.querySelector(`#${name}, [name="${name}"]`);

  // UI errores (sin duplicados)
  function ensureErrorNode(inputEl){
    let sib = inputEl.nextElementSibling;
    if (sib && sib.classList?.contains("field-error")) return sib;
    const node = document.createElement("div");
    node.className = "field-error";
    inputEl.insertAdjacentElement("afterend", node);
    return node;
  }
  function setFieldError(el, msg){
    if (!el) return;
    const node = ensureErrorNode(el);
    if (msg) { node.textContent = msg; node.style.display = "block"; el.classList.add("is-invalid"); }
    else     { node.textContent = "";  node.style.display = "none";  el.classList.remove("is-invalid"); }
  }

  // Sanitizar teléfono (solo dígitos, máx 10)
  const tel = $f("telefono");
  if (tel) tel.addEventListener("input", ()=> tel.value = tel.value.replace(/\D+/g,"").slice(0,10));

  // Reglas
  const rules = [
    { key:"nombre",    msg:"Nombre requerido.",          test:v=>v.trim().length>1 },
    { key:"correo",    msg:"Correo inválido.",           test:v=>/^[^\s@]+@[^\s@]+(\.[^\s@]+)+$/.test(v) },
    { key:"password",  msg:"Mínimo 6 caracteres.",       test:v=>v.length>=6 },
    { key:"cedula",    msg:"Cédula requerida.",          test:v=>v.trim().length>3 },
    { key:"telefono",  msg:"Teléfono de 10 dígitos.",    test:v=>/^\d{10}$/.test(v) },
    { key:"calle",     msg:"Calle requerida.",           test:v=>v.trim().length>0 },
    { key:"numero",    msg:"Número requerido.",          test:v=>v.trim().length>0 },
    { key:"colonia",   msg:"Colonia requerida.",         test:v=>v.trim().length>0 },
    { key:"municipio", msg:"Municipio requerido.",       test:v=>v.trim().length>0 },
    { key:"estado",    msg:"Estado requerido.",          test:v=>v.trim().length>0 },
    { key:"cp",        msg:"CP requerido.",              test:v=>v.trim().length>0 },
  ];

  function validateField(key){
    const el = $f(key);
    if (!el) return true;
    const rule = rules.find(r=>r.key===key);
    const ok = rule ? !!rule.test(el.value||"") : true;
    setFieldError(el, ok ? "" : rule.msg);
    return ok;
  }

  function validateForm(){
    let okAll = true, firstBadEl = null;
    for (const r of rules){
      const el = $f(r.key);
      const ok = validateField(r.key);
      if (!ok && !firstBadEl) firstBadEl = el;
      okAll = okAll && ok;
    }
    submitBtn.disabled = !okAll;
    return { ok: okAll, firstBadEl };
  }

  // Validación en tiempo real
  for (const r of rules){
    const el = $f(r.key);
    if (!el) continue;
    el.addEventListener("input", validateForm);
    el.addEventListener("blur",  ()=>validateField(r.key));
  }
  validateForm();

  async function doRegister(){
    const { ok, firstBadEl } = validateForm();
    if (!ok) {
      firstBadEl?.focus();
      alert("Faltan datos o hay errores. Revisa los campos marcados en rojo.");
      return;
    }

    // Lock UI seguro
    const oldTxt = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Registrando…";

    const v = (k)=> ($f(k)?.value || "").trim();

    try{
      const nombre   = v("nombre");
      const correo   = v("correo").toLowerCase();
      const password = v("password");
      const cedula   = v("cedula");
      const telefono = v("telefono");

      const calle    = v("calle");
      const numero   = v("numero");
      const colonia  = v("colonia");
      const municipio= v("municipio");
      const estado   = v("estado");
      const cp       = v("cp");
      const especialidad = v("especialidad");

      // 1) Auth
      const { user } = await createUserWithEmailAndPassword(auth, correo, password);
      await updateProfile(user, { displayName: nombre });

      // 2) Firestore (defaults seguros: suspendido/no verificado)
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
        estadoCuenta: "suspendido",
        suspendido: true,
        correoVerificado: false,
        verificado: false
      });

      alert("Cuenta creada. Un administrador verificará y activará tu cuenta.");
      window.location.href = "/espera_verificacion.html";
    }catch(e){
      console.error(e);
      alert("No se pudo registrar: " + (e?.message || e));
      submitBtn.disabled = false;
      submitBtn.textContent = oldTxt;
    }
  }

  // ¡Aquí el submit del form!
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    doRegister();
  });
});
