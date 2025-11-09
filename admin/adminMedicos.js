// /admin/adminMedicos.js — listar médicos + verificar correo + activar/desactivar

// ===== Imports =====
import { auth, db } from "../firebase-init.js";
import {
  collection, onSnapshot, query, orderBy, limit,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// ===== Constantes =====
const VERIFY_EMAIL_ENDPOINT = "/api/verify-email"; // proxy same-origin (vercel.json)
const ADMIN_EMAIL = "admin@kodrx.app";             // guard suave

// ===== waitAuthUser (fallback si no existe) =====
if (!window.waitAuthUser) {
  window.waitAuthUser = new Promise((resolve) => {
    onAuthStateChanged(auth, (u) => resolve(u));
  });
}

// ===== Helpers de estado =====
function estaActivo(m) {
  // considera activos si estadoCuenta === "activo" y NO suspendido
  const estado = (m.estadoCuenta || "").toLowerCase();
  const susp = !!m.suspendido;
  return (estado === "activo" || estado === "verificado" || estado === "habilitado") && !susp;
}
function estaVerificado(m) {
  return !!m.correoVerificado || !!m.emailVerified || !!m.verificado;
}

// ===== Render tarjeta =====
function tarjetaMedico(m) {
  const activo = estaActivo(m);
  const verifCorreo = estaVerificado(m);

  return `
    <div class="card-medico" data-uid="${m.uid}">
      <div class="fila">
        <div class="col">
          <h3>${m.nombre || m.displayName || "Sin nombre"}</h3>
          <p>${m.correo || m.email || ""}</p>
          <p><small>Cédula: ${m.cedula || "—"}</small></p>
        </div>
        <div class="col estado" style="text-align:right">
          <div style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap">
            <span class="pill-estado ${activo ? "ok" : "off"}">
              ${activo ? "Activo ✅" : "Suspendido ⛔"}
            </span>
            <span class="pill-correo ${verifCorreo ? "ok" : ""}">
              ${verifCorreo ? "Correo verificado ✅" : "Correo no verificado"}
            </span>
          </div>
        </div>
      </div>

      <div class="acciones" style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
        <button class="btn" data-act="${activo ? "desactivarMedico" : "activarMedico"}">
          ${activo ? "Desactivar" : "Activar"}
        </button>

        <button class="btn" data-act="verificarMail" ${verifCorreo ? "disabled" : ""}>
          ${verifCorreo ? "Correo verificado" : "Verificar correo"}
        </button>
      </div>
    </div>
  `;
}

// ===== Pintar lista =====
function pintarMedicos(lista) {
  const cont = document.getElementById("listaMedicos");
  if (!cont) return;

  const norm = lista.map(d => ({
    uid: d.uid,
    nombre: d.nombre ?? d.displayName ?? "Sin nombre",
    correo: d.correo ?? d.email ?? "",
    cedula: d.cedula ?? "—",
    correoVerificado: !!d.correoVerificado,
    emailVerified: !!d.emailVerified,
    verificado: !!d.verificado,
    estadoCuenta: d.estadoCuenta ?? "",
    suspendido: !!d.suspendido
  }));

  const pendientes = norm.filter(m => !estaVerificado(m) || !estaActivo(m));
  const ok = norm.filter(m => estaVerificado(m) && estaActivo(m));

  cont.innerHTML = `
    <h3>Pendientes de acción (${pendientes.length})</h3>
    ${pendientes.map(tarjetaMedico).join("") || "<p>Sin pendientes.</p>"}

    <h3 style="margin-top:24px;">Activos y verificados (${ok.length})</h3>
    ${ok.map(tarjetaMedico).join("") || "<p>Sin activos verificados.</p>"}
  `;
}

// ===== Escuchar colección =====
function escucharMedicos() {
  const q = query(collection(db, "medicos"), orderBy("nombre"), limit(500));
  onSnapshot(q, (snap) => {
    const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    pintarMedicos(lista);
  }, (err) => {
    console.error("Error escuchando medicos:", err);
    pintarMedicos([]);
  });
}

// ===== Acción: verificar correo (micro-servicio) =====
async function marcarCorreoVerificado(uid) {
  const u = await window.waitAuthUser;
  if (!u) throw new Error("Sin sesión de administrador");
  const token = await auth.currentUser.getIdToken(true);

  const r = await fetch(VERIFY_EMAIL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ uid })
  });

  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { throw new Error("Respuesta no JSON del servidor"); }
  if (!r.ok || !data?.ok) throw new Error(data?.error || `Fallo verificar (${r.status})`);

  // espejo local rápido (la función ya actualiza en server)
  try {
    await updateDoc(doc(db, "medicos", uid), {
      correoVerificado: true,
      verificado: true, // opcional si tu flujo lo usa
      updatedAt: serverTimestamp(),
      verificadoPor: auth.currentUser.email || "admin"
    });
  } catch (_) {}

  return data;
}

// ===== Acción: activar/desactivar médico (solo Firestore) =====
async function toggleActivo(uid, activar) {
  const u = await window.waitAuthUser;
  if (!u) throw new Error("Sin sesión de administrador");

  // Campos que tu app usa para checadores de estado
  const payload = activar
    ? { estadoCuenta: "activo", suspendido: false, updatedAt: serverTimestamp() }
    : { estadoCuenta: "suspendido", suspendido: true, updatedAt: serverTimestamp() };

  // (opcional) si tu flujo requiere verificado:=true al activar:
  if (activar) payload.verificado = true;

  await updateDoc(doc(db, "medicos", uid), payload);
}

// ===== Delegación de eventos =====
document.addEventListener("click", async (ev) => {
  const btn = ev.target;
  const act = btn?.dataset?.act;
  if (!act) return;

  const card = btn.closest(".card-medico");
  const uid  = card?.dataset?.uid;
  if (!uid) return;

  try {
    if (act === "verificarMail") {
      if (!confirm("¿Marcar el correo de este médico como verificado?")) return;
      btn.disabled = true;
      await marcarCorreoVerificado(uid);

      // repinta pill correo
      const pillCorreo = card.querySelector(".pill-correo");
      pillCorreo?.classList.add("ok");
      if (pillCorreo) pillCorreo.textContent = "Correo verificado ✅";
      btn.textContent = "Correo verificado";
      alert("Correo verificado ✅");
      return;
    }

    if (act === "activarMedico") {
      if (!confirm("¿Activar al médico (podrá sellar recetas)?")) return;
      btn.disabled = true;
      await toggleActivo(uid, true);

      // repinta UI de estado
      const pillEstado = card.querySelector(".pill-estado");
      pillEstado?.classList.remove("off");
      pillEstado?.classList.add("ok");
      if (pillEstado) pillEstado.textContent = "Activo ✅";
      btn.textContent = "Desactivar";
      btn.dataset.act = "desactivarMedico";
      alert("Médico activado ✅");
      return;
    }

    if (act === "desactivarMedico") {
      if (!confirm("¿Desactivar al médico (no podrá sellar recetas)?")) return;
      btn.disabled = true;
      await toggleActivo(uid, false);

      const pillEstado = card.querySelector(".pill-estado");
      pillEstado?.classList.remove("ok");
      pillEstado?.classList.add("off");
      if (pillEstado) pillEstado.textContent = "Suspendido ⛔";
      btn.textContent = "Activar";
      btn.dataset.act = "activarMedico";
      alert("Médico desactivado ⛔");
      return;
    }
  } catch (e) {
    console.error(e);
    alert("Error: " + (e?.message || "desconocido"));
  } finally {
    // reactivar botón para siguientes acciones
    btn.disabled = false;
  }
});

// ===== Inicio =====
(async () => {
  const u = await window.waitAuthUser;
  if (!u) { alert("Debes iniciar sesión como administrador."); location.href = "/admin/login.html"; return; }
  if ((u.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("No tienes permisos de administrador."); location.href = "/admin/login.html"; return;
  }
  escucharMedicos();
})();

/* ===== Estilos mínimos (llevar a CSS global si gustas)
.pill-estado, .pill-correo{
  display:inline-block; padding:4px 8px; border-radius:999px;
  background:#eee; color:#444; font-size:.85rem; border:1px solid #ddd;
}
.pill-estado.ok{ background:#16a34a20; color:#166534; border-color:#16a34a; }
.pill-estado.off{ background:#fee2e2; color:#991b1b; border-color:#ef4444; }
.pill-correo.ok{ background:#d1fae5; color:#065f46; border-color:#10b981; }
.btn[disabled]{ opacity:.6; cursor:not-allowed; }
.card-medico{ border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin:10px 0; }
.fila{ display:flex; gap:12px; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; }
.col{ min-width:0; }
*/

