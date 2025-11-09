// /admin/adminMedicos.js — TODO en uno: listar médicos + verificar correo

// ===== Imports Firebase (usa tu init global) =====
import { auth, db } from "../firebase-init.js";
import {
  collection, onSnapshot, query, orderBy, limit,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// ===== Constantes =====
const VERIFY_EMAIL_ENDPOINT = "/api/verify-email"; // proxy same-origin (vercel.json)
const ADMIN_EMAIL = "admin@kodrx.app";             // guard suave, por si lo necesitas

// ===== Helper: esperar sesión lista (fallback si no existe window.waitAuthUser) =====
if (!window.waitAuthUser) {
  window.waitAuthUser = new Promise((resolve) => {
    onAuthStateChanged(auth, (u) => resolve(u));
  });
}

// ===== Render de tarjeta de cada médico =====
function tarjetaMedico(m) {
  const verificado = !!m.correoVerificado || !!m.emailVerified;
  return `
    <div class="card-medico" data-uid="${m.uid}">
      <div class="fila">
        <div class="col">
          <h3>${m.nombre || m.displayName || "Sin nombre"}</h3>
          <p>${m.correo || m.email || ""}</p>
          <p><small>Cédula: ${m.cedula || "—"}</small></p>
        </div>
        <div class="col estado" style="text-align:right">
          <span class="pill-correo ${verificado ? "ok" : ""}">
            ${verificado ? "Verificado ✅" : "No verificado"}
          </span>
        </div>
      </div>
      <div class="acciones" style="margin-top:8px">
        <button class="btn" data-act="verificarMail" ${verificado ? "disabled" : ""}>
          ${verificado ? "Correo verificado" : "Verificar correo"}
        </button>
      </div>
    </div>
  `;
}

// ===== Pintar lista (una sola sección o separadas) =====
function pintarMedicos(lista) {
  const cont = document.getElementById("listaMedicos");
  if (!cont) return;

  // Normaliza campos esperados
  const norm = lista.map(d => ({
    uid: d.uid,
    nombre: d.nombre ?? d.displayName ?? "Sin nombre",
    correo: d.correo ?? d.email ?? "",
    cedula: d.cedula ?? "—",
    correoVerificado: !!d.correoVerificado,
    emailVerified: !!d.emailVerified
  }));

  const pendientes = norm.filter(m => !m.correoVerificado && !m.emailVerified);
  const verificados = norm.filter(m => m.correoVerificado || m.emailVerified);

  cont.innerHTML = `
    <h3>Pendientes de verificación (${pendientes.length})</h3>
    ${pendientes.map(tarjetaMedico).join("") || "<p>Sin pendientes.</p>"}

    <h3 style="margin-top:24px;">Verificados (${verificados.length})</h3>
    ${verificados.map(tarjetaMedico).join("") || "<p>Sin verificados.</p>"}
  `;
}

// ===== Escuchar colección de médicos (en vivo) =====
function escucharMedicos() {
  // Ajusta el orderBy a tus campos disponibles (nombre / createdAt / updatedAt)
  const q = query(collection(db, "medicos"), orderBy("nombre"), limit(500));

  onSnapshot(q, (snap) => {
    const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    pintarMedicos(lista);
  }, (err) => {
    console.error("Error escuchando medicos:", err);
    pintarMedicos([]);
  });
}

// ===== Acción: llamar micro-servicio para verificar correo =====
async function marcarCorreoVerificado(uid) {
  // Espera sesión y revisa admin básico (opcional)
  const u = await window.waitAuthUser;
  if (!u) throw new Error("Sin sesión de administrador");
  // Opcional: valida email admin
  if ((u.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    console.warn("Advertencia: el email actual no coincide con ADMIN_EMAIL");
  }

  const token = await auth.currentUser.getIdToken(true);

  const r = await fetch(VERIFY_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ uid })
  });

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error("Respuesta no JSON del servidor (ver proxy /api/verify-email)"); }

  if (!r.ok || !data?.ok) {
    throw new Error(data?.error || `Fallo verificar (${r.status})`);
  }

  // Espejo local (la función ya lo hace server-side; esto solo acelera UI)
  try {
    await updateDoc(doc(db, "medicos", uid), {
      correoVerificado: true,
      verificadoPor: auth.currentUser.email || "admin",
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    // No bloquees por esto; ya está verificado en Auth
    console.warn("No se actualizó espejo local:", e?.message || e);
  }

  return data;
}

// ===== Delegación de eventos: click "Verificar correo" =====
document.addEventListener("click", async (ev) => {
  const btn = ev.target;
  const act = btn?.dataset?.act;
  if (act !== "verificarMail") return;

  const card = btn.closest(".card-medico");
  const uid  = card?.dataset?.uid;
  if (!uid) return alert("UID no encontrado en la tarjeta.");

  if (!confirm("¿Marcar el correo de este médico como verificado?")) return;

  btn.disabled = true;
  const pill = card.querySelector(".pill-correo");

  try {
    await marcarCorreoVerificado(uid);

    // Repintado rápido
    pill?.classList.add("ok");
    if (pill) pill.textContent = "Verificado ✅";
    btn.textContent = "Correo verificado";
    alert("Correo verificado ✅");
  } catch (e) {
    console.error(e);
    alert("Error: " + (e?.message || "desconocido"));
    btn.disabled = false;
  }
});

// ===== Inicio: valida sesión y arranca listener =====
(async () => {
  const u = await window.waitAuthUser;
  if (!u) {
    alert("Debes iniciar sesión como administrador.");
    location.href = "/admin/login.html";
    return;
  }
  // Guard ligero por email (opcional)
  if ((u.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    alert("No tienes permisos de administrador.");
    location.href = "/admin/login.html";
    return;
  }
  escucharMedicos();
})();

/* ===== (Opcional) estilos mínimos; llévalos a tu CSS global
.pill-correo{
  display:inline-block; padding:4px 8px; border-radius:999px;
  background:#eee; color:#444; font-size:.85rem; border:1px solid #ddd;
}
.pill-correo.ok{ background:#16a34a20; color:#166534; border-color:#16a34a; }
.btn[disabled]{ opacity:.6; cursor:not-allowed; }
.card-medico{ border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin:10px 0; }
.fila{ display:flex; gap:12px; align-items:flex-start; justify-content:space-between; }
.col{ min-width:0; }
*/
