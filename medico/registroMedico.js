// registroMedico.js — FIX: DOM ready, botón no-nulo y errores sin duplicados
import { auth, db } from "../firebase-init.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { setDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // Refs seguros (ya existen en DOM)
  const form = $("formRegistroMedico");
  const btn  = $("btnRegistrar");

  // Si falta algo, no sigas
  if (!form || !btn) {
    console.error("[Registro] No se encontró formRegistroMedico o btnRegistrar");
    return;
  }

  // ---------- helpers UI de error (sin duplicados) ----------
  function ensureErrorNode(inputEl) {
    // 1) Si hay un hermano inmediato con .field-error, úsalo
    const sib = inputEl.nextElementSibling;
    if (sib && sib.classList?.contains("field-error")) return sib;

    // 2) Si hay contenedor .campo y ya tiene uno, úsalo
    const wrap = inputEl.closest(".campo");
    if (wrap) {
      const exist = wrap.querySelector(":scope > .field-error");
      if (exist) return exist;
    }

    // 3) Crear uno nuevo (hermano inmediato)
    const node = document.createElement("div");
    node.className = "field-error";
    inputEl.insertAdjacentElement("afterend", node);
    return node;
  }

  function setFieldError(inputId, msg) {
    const el = $(inputId);
    if (!el) return;
    const node = ensureErrorNode(el);
    if (msg) {
      node.textContent = msg;
      node.style.display = "block";
      el.classList.add("is-invalid");
    } else {
      node.textContent = "";
      node.style.display = "none";
      el.classList.remove("is-invalid");
    }
  }

  // ---------- sanitizar teléfono ----------
  const tel = $("telefono");
  if (tel) {
    tel.addEventListener("input", () => {
      tel.value = tel.value.replace(/\D+/g, "").slice(0, 10);
    });
  }

  // ---------- validadores ----------
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
    cp          : { test:v=>v.trim().length>0,      msg:"CP requerido." }
    // especialidad opcional
  };

  function validateField(id) {
    const el = $(id);
    if (!el) return true; // si no existe el input, no bloquea
    const rule = rules[id];
    if (!rule) { setFieldError(id, ""); return true; }
    const ok = !!rule.test(el.value || "");
    setFieldError(id, ok ? "" : rule.msg);
    return ok;
  }

  function validateForm() {
    let allOk = true;
    let firstBad = null;
    for (const id of Object.keys(rules)) {
      const ok = validateField(id);
      if (!ok && !firstBad) firstBad = id;
      allOk = allOk && ok;
    }
    btn.disabled = !allOk;
    return { ok: allOk, firstBad };
  }

  // Eventos de validación (una sola vez)
  for (const id of Object.keys(rules)) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener("input", validateForm);
    el.addEventListener("blur",  () => validateField(id));
  }
  // Evalúa una vez ya con DOM listo
  validateForm();

  // ---------- submit robusto ----------
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const { ok, firstBad } = validateForm();
    if (!ok) {
      if (firstBad) $(firstBad).focus();
      alert("Faltan datos o hay errores. Revisa los campos marcados en rojo.");
      return;
    }

    // Lock UI
    const oldTxt = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Registrando…";

    try {
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
        // defaults:
        estadoCuenta: "suspendido",
        suspendido: true,
        correoVerificado: false,
        verificado: false
      });

      alert("Cuenta creada. Un administrador verificará y activará tu cuenta.");
      window.location.href = "/espera_verificacion.html";
    } catch (e) {
      console.error(e);
      alert("No se pudo registrar: " + (e?.message || e));
      btn.disabled = false;
      btn.textContent = oldTxt;
    }
  });
});
