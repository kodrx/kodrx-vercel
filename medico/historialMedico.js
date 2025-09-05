// /medico/historialMedico.js
// Cargar este archivo con <script type="module"> en la página

import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection, query, where, orderBy, limit, startAfter,
  startAt, endAt, getDocs, onSnapshot, Timestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- Config
const PAGE_SIZE = 50;

// --- Estado UI/consulta
const state = {
  user: null,
  term: "",          // búsqueda por nombre
  dateISO: "",       // yyyy-mm-dd
  lastDoc: null,     // cursor de paginación
  unsub: null,       // para onSnapshot (modo tiempo real)
  mode: "default",   // 'default' | 'search' | 'date'
};

// --- Utilidades
const $ = (sel) => document.querySelector(sel);
const fmtMx = (d) => d.toLocaleString('es-MX',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});

function debounce(fn, ms=300){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

// --- Construye la query según el modo actual
function buildQuery(firstPage=true) {
  const recetasCol = collection(db, "recetas");
  const uid = state.user.uid;

  // 1) Búsqueda por nombre (prefijo), SIEMPRE filtrando por médico
  if (state.term) {
    state.mode = "search";
    const term = state.term;
    // Requiere índice compuesto (medicoUid + pacienteNombre)
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

  // 2) Filtro por fecha (rango del día), SIEMPRE por médico
  if (state.dateISO) {
    state.mode = "date";
    const [y,m,d] = state.dateISO.split("-").map(n=>parseInt(n,10));
    const start = new Date(y, m-1, d, 0, 0, 0, 0);
    const end   = new Date(y, m-1, d+1, 0, 0, 0, 0);

    // Requiere índice compuesto (medicoUid + timestamp)
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

  // 3) Default: últimas recetas del médico (tiempo real si es la primera carga)
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

// --- Loader de primera página
async function loadFirstPage({ realtime=true } = {}) {
  state.lastDoc = null;

  const q = buildQuery(true);

  // Para "default", usamos tiempo real; para search/fecha, usamos getDocs
  const useRealtime = (state.mode === "default") && realtime;

  // Limpia listener anterior si existía
  if (state.unsub) { state.unsub(); state.unsub = null; }

  if (useRealtime) {
    state.unsub = onSnapshot(q, (snap)=>{
      const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
      renderHistorial(items, { reset:true });
    }, (err)=>{
      if (err.code === "failed-precondition") {
        console.warn("Falta índice compuesto para (medicoUid + timestamp). Crea el índice desde el link de la consola y recarga.");
      } else {
        console.error("[historial] onSnapshot error:", err);
      }
    });
  } else {
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
    renderHistorial(items, { reset:true });
  }
}

// --- Paginación (siguiente página)
async function loadNextPage() {
  if (!state.lastDoc) return;
  const q = buildQuery(false);
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  state.lastDoc = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
  renderHistorial(items, { reset:false });
}

// --- Render (ajusta a tu UI)
function renderHistorial(recetas, { reset=false } = {}) {
  const cont = $("#historialLista");
  if (!cont) return;
  if (reset) cont.innerHTML = "";

  const html = recetas.map(r=>{
    const ts = r.timestamp?.toDate ? r.timestamp.toDate() :
               (typeof r.timestamp?.seconds === "number" ? new Date(r.timestamp.seconds*1000) : null);
    const fecha = ts ? fmtMx(ts) : "—";
    const p = r.pacienteNombre || "Paciente sin nombre";
    const m = r.medicoNombre   || "—";
    return `
      <div class="item-receta borde p-3 mb-3 rounded">
        <div class="flex justify-between">
          <div><strong>${p}</strong> <small class="opacity-70">(${r.id})</small></div>
          <div><small>${fecha}</small></div>
        </div>
        <div class="mt-1"><small>Médico: ${m}</small></div>
        <div class="mt-2">
          <a class="btn btn-sm" href="/public/ver-receta.html?id=${r.id}">Ver</a>
        </div>
      </div>`;
  }).join("");

  cont.insertAdjacentHTML("beforeend", html);

  const moreBtn = $("#btnMas");
  if (moreBtn) {
    moreBtn.style.display = state.lastDoc ? "inline-flex" : "none";
  }
}

// --- Event listeners UI
function setupUI() {
  // Buscar por nombre (prefijo)
  const input = $("#buscarNombre");
  if (input) {
    input.addEventListener("input", debounce(async ()=>{
      state.term = (input.value || "").trim();
      await loadFirstPage({ realtime:false });
    }, 300));
  }

  // Filtro por fecha (yyyy-mm-dd)
  const date = $("#filtrarFecha");
  if (date) {
    date.addEventListener("change", async ()=>{
      state.dateISO = (date.value || "").trim();
      await loadFirstPage({ realtime:false });
    });
  }

  // Botón "ver más"
  const moreBtn = $("#btnMas");
  if (moreBtn) {
    moreBtn.addEventListener("click", loadNextPage);
  }
}

// --- Bootstrap
onAuthStateChanged(auth, async (user)=>{
  if (!user) {
    const ret = encodeURIComponent(location.pathname + location.search);
    location.href = `/acceso?role=medico&return=${ret}`;
    return;
  }
  state.user = user;
  setupUI();
  await loadFirstPage({ realtime:true });
});


  }); // cierre onAuthStateChanged
}); // cierre DOMContentLoaded
