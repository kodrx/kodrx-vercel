// /medico/historialMedico.js
// Cargar este archivo con <script type="module"> en la página
console.log('[historial] módulo cargado');

import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection, query, where, orderBy, limit, startAfter,
  startAt, endAt, getDocs, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// =========================
// Config / Estado
// =========================
const DEBUG = true;
const PAGE_SIZE = 50;
// Fallbacks: primero 'correo' (legado), luego variantes antiguas
const FALLBACK_FIELDS = ["correo", "medicoEmail", "medicoId", "uidMedico"];

const state = {
  user: null,
  term: "",
  dateISO: "",
  lastDoc: null,
  unsub: null,
  mode: "default",
  fallbackField: null,
};

// --- Admin override por QS (?email=... o ?uid=...)
const QS = new URLSearchParams(location.search);
const OV_EMAIL = (QS.get('email') || '').trim();
const OV_UID   = (QS.get('uid')   || '').trim();

// =========================
// Utils UI
// =========================
const $ = (sel) => document.querySelector(sel);
function debounce(fn, ms=300){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
const fmtMx = (d) => d.toLocaleString('es-MX',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});

// =========================
// Builder de consultas
// =========================
function buildQuery(firstPage=true) {
  const recetasCol = collection(db, "recetas");
  const uid = state.user.uid;

  if (state.term) {
    state.mode = "search";
    const term = state.term;
    let q = query(
      recetasCol,
      where("medicoUid", "==", uid),
      orderBy("pacienteNombre"),
      startAt(term),
      endAt(term + "\uf8ff"),
      limit(PAGE_SIZE)
    );
    if (!firstPage && state.lastDoc) {
      q = query(
        recetasCol,
        where("medicoUid", "==", uid),
        orderBy("pacienteNombre"),
        startAt(term),
        endAt(term + "\uf8ff"),
        startAfter(state.lastDoc),
        limit(PAGE_SIZE)
      );
    }
    return q;
  }

  if (state.dateISO) {
    state.mode = "date";
    const [y,m,d] = state.dateISO.split("-").map(n=>parseInt(n,10));
    const start = new Date(y, m-1, d, 0, 0, 0, 0);
    const end   = new Date(y, m-1, d+1, 0, 0, 0, 0);

    let q = query(
      recetasCol,
      where("medicoUid", "==", uid),
      where("timestamp", ">=", Timestamp.fromDate(start)),
      where("timestamp", "<",  Timestamp.fromDate(end)),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );
    if (!firstPage && state.lastDoc) {
      q = query(
        recetasCol,
        where("medicoUid", "==", uid),
        where("timestamp", ">=", Timestamp.fromDate(start)),
        where("timestamp", "<",  Timestamp.fromDate(end)),
        orderBy("timestamp", "desc"),
        startAfter(state.lastDoc),
        limit(PAGE_SIZE)
      );
    }
    return q;
  }

  state.mode = "default";
  let q = query(
    recetasCol,
    where("medicoUid", "==", uid),
    orderBy("timestamp", "desc"),
    limit(PAGE_SIZE)
  );
  if (!firstPage && state.lastDoc) {
    q = query(
      recetasCol,
      where("medicoUid", "==", uid),
      orderBy("timestamp", "desc"),
      startAfter(state.lastDoc),
      limit(PAGE_SIZE)
    );
  }
  return q;
}

// =========================
// Admin override loaders
// =========================
async function loadFirstPageAdminOverride({ email, uid }) {
  state.lastDoc = null;
  let items = [];

  try {
    if (uid) {
      const q = query(
        collection(db, 'recetas'),
        where('medicoUid','==', uid),
        orderBy('timestamp','desc'),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
    } else if (email) {
      // 1) probar 'correo'
      try {
        const q1 = query(
          collection(db, 'recetas'),
          where('correo','==', email),
          orderBy('timestamp','desc'),
          limit(PAGE_SIZE)
        );
        const s1 = await getDocs(q1);
        items = s1.docs.map(d => ({ id:d.id, ...d.data() }));
        state.lastDoc = s1.docs.length ? s1.docs[s1.docs.length-1] : null;
      } catch(e) {
        if (e.code === 'failed-precondition') {
          const m = e.message?.match(/https?:\/\/\S+/);
          if (m && m[0]) console.info('➡️ Crea el índice correo+timestamp aquí:', m[0]);
        } else { console.warn(e); }
      }
      // 2) si vacío, probar 'medicoEmail'
      if (!items.length) {
        const q2 = query(
          collection(db, 'recetas'),
          where('medicoEmail','==', email),
          orderBy('timestamp','desc'),
          limit(PAGE_SIZE)
        );
        const s2 = await getDocs(q2);
        items = s2.docs.map(d => ({ id:d.id, ...d.data() }));
        state.lastDoc = s2.docs.length ? s2.docs[s2.docs.length-1] : null;
      }
    }
  } catch(err) {
    console.error('[override] error:', err);
    alert('Error en override. Revisa consola.');
  }

  renderHistorial(items, { reset:true });
  const moreBtn = document.querySelector('#btnMas');
  if (moreBtn) moreBtn.style.display = state.lastDoc ? 'inline-flex' : 'none';
}

// =========================
/* Carga inicial y paginación */
// =========================
async function loadFirstPage({ realtime=true } = {}) {
  state.lastDoc = null;
  state.fallbackField = null;

  const q = buildQuery(true);
  const useRealtime = (state.mode === "default") && realtime;

  if (state.unsub) { state.unsub(); state.unsub = null; }

  if (DEBUG) {
    console.log("[historial] user.uid:", state.user?.uid);
    console.log("[historial] mode:", state.mode);
  }

  if (useRealtime) {
    state.unsub = onSnapshot(q, async (snap)=>{
      const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
      await postProcessAndRender(items, /*firstPage=*/true);
    }, (err)=>{
      console.error("[historial] onSnapshot error:", err);
      if (err.code === "failed-precondition") {
        const m = (err && err.message) ? err.message.match(/https?:\/\/\S+/) : null;
        if (m && m[0]) console.info("➡️ Crea el índice aquí:", m[0]);
        alert("Falta un índice compuesto. Revisa la consola: aparece el link para crearlo.");
      }
    });
  } else {
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
    await postProcessAndRender(items, /*firstPage=*/true);
  }
}

async function loadNextPage() {
  const moreBtn = document.querySelector("#btnMas");
  if (!state.lastDoc || moreBtn?.__busy) return;
  if (moreBtn) { moreBtn.__busy = true; moreBtn.disabled = true; }

  try {
    let q = null;
    if (state.fallbackField) {
      const value = state.fallbackField.includes("Email") ? (state.user.email || "") : state.user.uid;
      q = query(
        collection(db, "recetas"),
        where(state.fallbackField, "==", value),
        orderBy("timestamp", "desc"),
        startAfter(state.lastDoc),
        limit(PAGE_SIZE)
      );
    } else {
      q = buildQuery(false);
    }

    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
    renderHistorial(items, { reset:false });
  } finally {
    if (moreBtn) { moreBtn.__busy = false; moreBtn.disabled = false; }
  }
}

// =========================
/* Post-proceso y fallback */
// =========================
async function postProcessAndRender(items, firstPage){
  if (DEBUG) console.log("[historial] items:", items.length, items);
  renderHistorial(items, { reset:firstPage });

  if (firstPage && state.mode === "default" && items.length === 0) {
    try {
      const snapAny = await getDocs(query(collection(db,"recetas"), limit(5)));
      console.log("[probe] muestras en 'recetas':", snapAny.size);
      if (snapAny.size > 0) {
        const muestras = snapAny.docs.map(d=>({ id:d.id, ...d.data() }));
        console.log("[probe] ejemplo de una receta:", muestras[0]);
      }
    } catch(e){ console.warn("[probe] error listando muestras:", e); }

    for (const field of FALLBACK_FIELDS) {
      try {
        const value = field.includes("Email") ? (state.user.email || "") : (field === "correo" ? (state.user.email || "") : state.user.uid);
        if (!value) continue;

        const qAlt = query(
          collection(db,"recetas"),
          where(field,"==", value),
          orderBy("timestamp","desc"),
          limit(PAGE_SIZE)
        );
        const sAlt = await getDocs(qAlt);
        console.log(`[probe] usando ${field}, items:`, sAlt.size);
        if (sAlt.size > 0) {
          state.fallbackField = field;
          const itemsAlt = sAlt.docs.map(d=>({id:d.id, ...d.data()}));

          const box = document.querySelector("#historialLista");
          if (box) {
            box.insertAdjacentHTML("afterbegin",
              `<div style="padding:8px;margin-bottom:8px;background:#fff3cd;border:1px solid #ffeeba;border-radius:8px;">
                 <strong>Nota:</strong> estas recetas usan <code>${field}</code> en vez de <code>medicoUid</code>.
                 Te sugiero hacer backfill para habilitar tiempo real y búsqueda completa.
               </div>`);
          }

          renderHistorial(itemsAlt, { reset:true });
          state.lastDoc = sAlt.docs.length ? sAlt.docs[sAlt.docs.length-1] : null;

          const moreBtn = document.querySelector("#btnMas");
          if (moreBtn) moreBtn.style.display = state.lastDoc ? "inline-flex" : "none";
          return;
        }
      } catch(e) {
        console.warn(`[probe] índice requerido para ${field} + timestamp`, e?.message || e);
      }
    }

    const cont = document.querySelector("#historialLista");
    if (cont && !cont.innerHTML.trim()) {
      cont.innerHTML = `<div class="small" style="padding:8px 2px;">No hay recetas asociadas a tu usuario aún.</div>`;
    }
  }
}

// =========================
/* Render acordeones (compat con tu HTML/CSS) */
// =========================
function groupByDay(recetas){
  const out = new Map();
  for (const r of recetas) {
    const d = r.timestamp?.toDate ? r.timestamp.toDate()
            : (typeof r.timestamp?.seconds === "number" ? new Date(r.timestamp.seconds*1000) : null);
    const key = d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : 'sin-fecha';
    if (!out.has(key)) out.set(key, []);
    out.get(key).push({ r, d });
  }
  return [...out.entries()].sort((a,b)=> a[0]<b[0]?1:-1);
}

function horaMX(d){
  return d ? d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—';
}

function medsPreview(r){
  const meds = r.medicamentos || r.meds || [];
  if (!Array.isArray(meds) || !meds.length) return '<span class="small">Sin medicamentos</span>';
  const first = meds.slice(0,3).map(m => m?.nombre || '—');
  const extra = meds.length > 3 ? ` +${meds.length-3}` : '';
  return `<span class="small">${first.join(', ')}${extra}</span>`;
}

function renderHistorial(recetas, { reset=false } = {}) {
  const cont = document.querySelector("#historialLista");
  if (!cont) return;

  if (reset) cont.innerHTML = "";

  if (reset && (!recetas || recetas.length === 0)) {
    cont.innerHTML = `<div class="small" style="padding:8px 2px;">No hay recetas para mostrar.</div>`;
    const moreBtn = document.querySelector("#btnMas");
    if (moreBtn) moreBtn.style.display = "none";
    return;
  }

  const grouped = groupByDay(recetas);
  let html = "";

  for (const [dayKey, arr] of grouped) {
    const [y,m,d] = dayKey.split("-").map(n=>parseInt(n,10));
    const fechaLegible = (new Date(y, m-1, d)).toLocaleDateString('es-MX',{weekday:'long', year:'numeric', month:'long', day:'numeric'});

    html += `<div class="mb-2" style="margin:8px 2px; font-weight:700; color:#123f91;">${fechaLegible}</div>`;

    for (const {r, d:fecha} of arr) {
      const p = r.pacienteNombre || "Paciente sin nombre";
      const med = r.medicoNombre || "—";
      html += `
        <div class="acordeon" data-id="${r.id}">
          <div class="acordeon-header">
            <span>${horaMX(fecha)} — ${p}</span>
          </div>
          <div class="acordeon-body">
            <p><strong>ID:</strong> ${r.id}</p>
            <p><strong>Médico:</strong> ${med}</p>
            <div class="mt-2">${medsPreview(r)}</div>
            <div class="mt-2">
              <a class="boton-ver" href="/public/ver-receta.html?id=${r.id}">Ver</a>
            </div>
          </div>
        </div>`;
    }
  }

  cont.insertAdjacentHTML("beforeend", html);

  if (!cont.__binded) {
    cont.addEventListener("click", (ev)=>{
      const h = ev.target.closest(".acordeon-header");
      if (!h) return;
      const item = h.closest(".acordeon");
      item?.classList.toggle("open");
    });
    cont.__binded = true;
  }

  const moreBtn = document.querySelector("#btnMas");
  if (moreBtn) moreBtn.style.display = (state.lastDoc ? "inline-flex" : "none");
}

// =========================
/* UI: Listeners */
// =========================
function setupUI() {
  const input = $("#buscarNombre");
  if (input) {
    input.addEventListener("input", debounce(async ()=>{
      state.term = (input.value || "").trim();
      await loadFirstPage({ realtime:false });
    }, 300));
  }

  const date = $("#filtrarFecha");
  if (date) {
    date.addEventListener("change", async ()=>{
      state.dateISO = (date.value || "").trim();
      await loadFirstPage({ realtime:false });
    });
  }

  const moreBtn = $("#btnMas");
  if (moreBtn) moreBtn.addEventListener("click", loadNextPage);
}

// =========================
/* Bootstrap */
// =========================
onAuthStateChanged(auth, async (user)=>{
  if (!user) {
    const ret = encodeURIComponent(location.pathname + location.search);
    location.href = `/acceso?role=medico&return=${ret}`;
    return;
  }
  state.user = user;

  // Admin override (ver historial de otro médico por ?email= / ?uid=)
  if (OV_EMAIL || OV_UID) {
    console.log('[historial] admin override:', { OV_EMAIL, OV_UID });
    setupUI();
    await loadFirstPageAdminOverride({ email: OV_EMAIL, uid: OV_UID });
    return;
  }

  setupUI();
  await loadFirstPage({ realtime:true });
});

