// --- IMPORTS (deja los que ya tengas) ---
import { auth, db } from "../firebase-init.js";
import {
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- CONSTS ---
const VERIFY_EMAIL_ENDPOINT = "/api/verify-email"; // same-origin via vercel.json

// --- RENDER: tarjeta de cada médico (ajusta a tu HTML) ---
function tarjetaMedico(m) {
  const verificado = !!m.correoVerificado || !!m.emailVerified;
  return `
    <div class="card-medico" data-uid="${m.uid}">
      <div class="fila">
        <div class="col">
          <h3>${m.nombre || "Sin nombre"}</h3>
          <p>${m.correo || ""}</p>
          <p><small>Cédula: ${m.cedula || "—"}</small></p>
        </div>
        <div class="col estado">
          <span class="pill-correo ${verificado ? "ok" : ""}">
            ${verificado ? "Verificado ✅" : "No verificado"}
          </span>
        </div>
      </div>
      <div class="acciones">
        <button class="btn" data-act="verificarMail" ${verificado ? "disabled" : ""}>
          ${verificado ? "Correo verificado" : "Verificar correo"}
        </button>
      </div>
    </div>
  `;
}

// --- ACTION: marcar correo verificado usando micro-servicio ---
async function marcarCorreoVerificado(uid) {
  // espera sesión admin
  await window.waitAuthUser;
  const token = await auth.currentUser.getIdToken(true);

  const r = await fetch(VERIFY_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ uid })
  });

  // intenta leer JSON; si el proxy devolviera HTML por error, cae al catch del parse
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Respuesta no JSON del servidor"); }

  if (!r.ok || !data?.ok) {
    throw new Error(data?.error || "No se pudo verificar el correo");
  }

  // espejo rápido en Firestore (opcional; la función ya lo hace servidor-side)
  try {
    await updateDoc(doc(db, "medicos", uid), {
      correoVerificado: true,
      verificadoPor: auth.currentUser.email || "admin",
      updatedAt: serverTimestamp()
    });
  } catch (_) { /* no bloquear por espejo local */ }

  return data;
}

// --- EVENT DELEGATION: click en botón verificar ---
document.addEventListener("click", async (ev) => {
  const act = ev.target?.dataset?.act;
  if (act !== "verificarMail") return;

  const card = ev.target.closest(".card-medico");
  const uid  = card?.dataset?.uid;
  if (!uid) return alert("UID no encontrado en la tarjeta.");

  if (!confirm("¿Marcar el correo de este médico como verificado?")) return;

  // UI: deshabilitar mientras procesa
  const btn = ev.target;
  btn.disabled = true;
  const pill = card.querySelector(".pill-correo");

  try {
    await marcarCorreoVerificado(uid);

    // UI: repintar estado
    pill?.classList.add("ok");
    if (pill) pill.textContent = "Verificado ✅";
    btn.textContent = "Correo verificado";
    alert("Correo verificado ✅");
  } catch (e) {
    console.error(e);
    alert("Error: " + e.message);
    btn.disabled = false; // reactivar botón si falló
  }
});

// --- (Opcional) Estilos rápidos para el badge ---
/* Puedes poner esto en tu CSS global:
.pill-correo{
  display:inline-block; padding:4px 8px; border-radius:999px;
  background:#eee; color:#444; font-size:.85rem;
}
.pill-correo.ok{ background:#16a34a20; color:#166534; border:1px solid #16a34a; }
.btn[disabled]{ opacity:.6; cursor:not-allowed; }
*/

// --- DONDE RENDERIZAS ---
// Cuando cargues tu lista de médicos, usa `tarjetaMedico(m)`:
async function pintarMedicos(lista) {
  const cont = document.getElementById("listaMedicos");
  cont.innerHTML = lista.map(tarjetaMedico).join("");
}
// llama pintarMedicos([...]) con tu data una vez obtenida

