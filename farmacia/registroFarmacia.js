// /farmacia/registroFarmacia.js
import { auth, db } from "/firebase-init.js";
import {
  createUserWithEmailAndPassword, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRegistro");
  if (!btn) return;

  btn.addEventListener("click", onSubmit, { capture: true });

  async function onSubmit(e){
    e.preventDefault();
    if (btn.dataset.busy === "1") return;
    btn.dataset.busy = "1";
    const prev = btn.textContent; btn.textContent = "Registrando…"; btn.disabled = true;

    const get = id => (document.getElementById(id)?.value || "").trim();
    const nombreFarmacia   = get("nombreFarmacia");
    const medicoResponsable= get("medicoResponsable");
    const telefono         = get("telefono");
    const correo           = get("correo");
    const password         = get("password");
    const estado           = get("estado");
    const municipio        = get("municipio");
    const colonia          = get("colonia");

    if (![nombreFarmacia, medicoResponsable, telefono, correo, password, estado, municipio, colonia].every(Boolean)){
      alert("Completa todos los campos."); return reset();
    }

    try{
      // 1) crear usuario
      const cred = await createUserWithEmailAndPassword(auth, correo, password);
      const uid = cred.user.uid;

      // 2) perfil en farmacias/{uid}
      const data = {
        uid, correo,
        nombreFarmacia,
        nombre: nombreFarmacia,          // alias común
        medicoResponsable,
        telefono,
        estado, municipio, colonia,
        verificado: false,
        estadoCuenta: "pendiente",       // ← admin la cambia a 'activo'
        suspendido: false,
        fechaRegistro: serverTimestamp()
      };
      await setDoc(doc(db, "farmacias", uid), data, { merge: true });

      // 3) verificación de correo (opcional)
      try{ await sendEmailVerification(cred.user); }catch{}

      alert("Registro enviado. Espera verificación.");
      location.href = "/farmacia/espera_verificacion.html";
    }catch(err){
      console.error("[REG-FARM] error:", err?.code, err?.message);
      const c = err?.code || "";
      if (c === "auth/email-already-in-use") alert("Ese correo ya está registrado.");
      else if (c === "auth/invalid-email")   alert("Correo inválido.");
      else if (c === "auth/weak-password")   alert("Contraseña muy débil.");
      else alert("No se pudo registrar. Intenta más tarde.");
      reset();
    }

    function reset(){
      btn.dataset.busy = "0";
      btn.textContent = prev; btn.disabled = false;
    }
  }
});
