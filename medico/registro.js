// /medico/registro.js  (Firebase 10.x)
import { auth, db } from "/firebase-init.js";
import { createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRegistro");
  if (!btn) { console.error("No se encontró #btnRegistro"); return; }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (btn.dataset.busy === "1") return; // anti doble click
    btn.dataset.busy = "1";
    const prev = btn.textContent; btn.textContent = "Registrando…"; btn.disabled = true;

    const campos = [
      "nombre", "especialidad", "correo", "telefono", "cedula",
      "calle", "numero", "colonia", "municipio", "estado", "cp",
      "password"
    ];
    const datos = {};
    for (const campo of campos) {
      const el = document.getElementById(campo);
      if (!el) { alert(`Falta el campo '${campo}' en el formulario`); resetBtn(); return; }
      datos[campo] = (el.value || "").trim();
    }

    const {
      nombre, especialidad, correo, telefono, cedula,
      calle, numero, colonia, municipio, estado, cp, password
    } = datos;

    if (Object.values(datos).some(v => !v)) {
      alert("Por favor completa todos los campos.");
      return resetBtn();
    }

    try {
      // 1) Crear cuenta
      const cred = await createUserWithEmailAndPassword(auth, correo, password);
      const uid = cred.user.uid;

      // 2) Guardar perfil del médico
      await setDoc(doc(db, "medicos", uid), {
        nombre,
        especialidad,
        correo,
        telefono,
        cedula,
        calle,
        numero,
        colonia,
        municipio,
        estado,
        cp,
        estadoCuenta: "activo",      // opcional: tu guard puede leer esto
        verificado: false,
        fechaRegistro: serverTimestamp()
      });

      // 3) (Opcional) Enviar verificación de correo
      try { await sendEmailVerification(cred.user); } catch {}

      alert("Registro enviado correctamente.");
      window.location.href = "/medico/espera_verificacion.html";
    } catch (error) {
      console.error("Error al registrar médico:", error?.code, error?.message);
      const code = error?.code || "";
      if (code === "auth/email-already-in-use")      alert("Ese correo ya está registrado.");
      else if (code === "auth/invalid-email")        alert("Correo inválido.");
      else if (code === "auth/weak-password")        alert("La contraseña es muy débil.");
      else                                           alert("Ocurrió un error al registrar el médico. Revisa los datos o intenta más tarde.");
      resetBtn();
    }

    function resetBtn(){
      btn.dataset.busy = "0";
      btn.textContent = prev;
      btn.disabled = false;
    }
  });
});

