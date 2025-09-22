// /medico/registroMedico.js — v20250921a (SDK 12.2.1)
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

console.log("[REG] registroMedico.js cargado");

auth.languageCode = "es";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formRegistro");
  const btn  = document.getElementById("btnRegistro");

  if (!btn && !form){
    console.error("[REG] No encontré #btnRegistro ni #formRegistro");
    return;
  }
  // Evita que el botón dentro de <form> provoque submit por defecto.
  if (btn && btn.type !== "button") btn.type = "button";

  const handler = async (e)=>{
    e?.preventDefault?.();
    console.log("[REG] submit hit");

    const busyEl = btn || form;
    const prevTxt = btn?.textContent;
    if (busyEl?.dataset.busy === "1") return;
    if (btn){ btn.disabled = true; btn.textContent = "Registrando…"; }
    busyEl && (busyEl.dataset.busy = "1");

    const campos = ["nombre","especialidad","correo","telefono","cedula","calle","numero","colonia","municipio","estado","cp","password"];
    const datos = {};
    for (const c of campos){
      const el = document.getElementById(c);
      if (!el){ alert(`Falta el campo '${c}' en el formulario`); return reset(); }
      datos[c] = (el.value || "").trim();
    }

    // Normalizaciones ligeras
    const normTitle = s => (s||"").trim().toLowerCase().replace(/\s+/g," ").replace(/(^|\s)\S/g, m=>m.toUpperCase());
    const normEmail = s => (s||"").trim().toLowerCase();
    const normPhone = s => (s||"").replace(/\D/g,"").slice(-10);
    const normCed   = s => (s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
    const buildDom  = d => `${d.calle||""} ${d.numero||""}, ${d.colonia||""}, ${d.municipio||""}, ${d.estado||""}, CP ${(d.cp||"").replace(/\D/g,"").slice(0,5)}`
                          .replace(/\s+,/g,",").replace(/,\s*,/g,", ").replace(/\s{2,}/g," ").trim();

    datos.nombre       = normTitle(datos.nombre);
    datos.especialidad = normTitle(datos.especialidad || "General");
    datos.correo       = normEmail(datos.correo);
    const tel          = normPhone(datos.telefono);
    const cp5          = (datos.cp||"").replace(/\D/g,"").slice(0,5);
    const cedNorm      = normCed(datos.cedula);
    const domicilio    = buildDom(datos);
    const searchName   = datos.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

    // Validaciones mínimas
    if (!datos.nombre || !datos.especialidad || !datos.correo || !datos.password){ alert("Completa todos los campos."); return reset(); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)){ alert("Correo no válido."); return reset(); }
    if (datos.password.length < 8){ alert("La contraseña debe tener al menos 8 caracteres."); return reset(); }
    if (tel.length !== 10){ alert("El teléfono debe tener 10 dígitos (MX)."); return reset(); }
    if (cp5.length !== 5){ alert("El código postal debe tener 5 dígitos."); return reset(); }
    if (!cedNorm){ alert("Cédula no válida."); return reset(); }

    let cred = null;
    try{
      // 1) Crear cuenta (queda signed-in)
      cred = await createUserWithEmailAndPassword(auth, datos.correo, datos.password);
      const uid = cred.user.uid;
      console.log("[REG] Auth OK uid=", uid);

      const perfRef = doc(db, "medicos", uid);
      const idxRef  = doc(db, "indices_cedulas", cedNorm);

      // 2) Reclamar cédula SIN leer (si ya existe → permission-denied por la regla de create-only)
      try{
        await setDoc(idxRef, { uid, email: datos.correo, telefono: tel, createdAt: serverTimestamp() }, { merge: false });
        console.log("[REG] Índice cédula creado:", cedNorm);
      }catch(e){
        console.warn("[REG] Reclamo de cédula falló:", e?.code||e);
        // Rollback de usuario Auth para no dejar huérfano
        try{ await deleteUser(cred.user); }catch{}
        try{ await signOut(auth); }catch{}
        alert("La cédula ya está registrada. No se creó la cuenta.");
        return reset();
      }

      // 3) Crear perfil del médico (el dueño puede create en /medicos/{uid})
      await setDoc(perfRef, {
        uid,
        nombre: datos.nombre,
        displayName: datos.nombre,
        searchName,
        especialidad: datos.especialidad,
        correo: datos.correo,
        telefono: tel,
        cedula: cedNorm,
        calle: datos.calle, numero: datos.numero, colonia: datos.colonia,
        municipio: datos.municipio, estado: datos.estado, cp: cp5,
        medicoDomicilio: domicilio,
        estadoCuenta: "activo",
        verificado: false,
        correoVerificado: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log("[REG] Perfil creado");

      // 4) Enviar verificación de correo (redirige a la página de espera)
      try{
        await sendEmailVerification(cred.user, {
          url: `${location.origin}/medico/espera_verificacion.html`,
          handleCodeInApp: false
        });
        console.log("[REG] Email de verificación enviado");
      }catch(e){
        console.warn("[REG] No se pudo enviar verificación (no bloquea):", e?.message||e);
      }

      alert("¡Registro exitoso! Revisa tu correo para verificar tu cuenta.");
      location.href = "/medico/espera_verificacion.html";

    }catch(err){
      console.error("[REG] Error general:", err?.code, err?.message);
      const code = err?.code || "";
      if (code === "auth/email-already-in-use")      alert("Ese correo ya está registrado.");
      else if (code === "auth/invalid-email")        alert("Correo inválido.");
      else if (code === "auth/weak-password")        alert("La contraseña es muy débil.");
      else                                           alert("No se pudo completar el registro. Inténtalo de nuevo.");
      reset();
    }
  };

  // Bindings (soporta botón y/o submit de form)
  if (btn) btn.addEventListener("click", handler);
  if (form) form.addEventListener("submit", handler);

  function reset(){
    const busyEl = btn || form;
    busyEl && (busyEl.dataset.busy = "0");
    if (btn){ btn.disabled = false; btn.textContent = "Registrarme"; }
  }
});
