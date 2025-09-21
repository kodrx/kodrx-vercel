// /medico/historialMedico.js — limpio (SDK 12.2.1)
import { auth, db } from "/firebase-init.js";
import {
  collection, query, where, orderBy, limit,
  getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const UI = {
  lista: document.getElementById("historialLista"),
  btnMas: document.getElementById("btnMas"),
  qNombre: document.getElementById("buscarNombre"),
  qFecha: document.getElementById("filtrarFecha"),
};

let _lastSnap = null;
let _uid = null;
const OWNER_FIELD = "medicoUid";
const PAGE = 15;

const state = { nombre: "", fechaISO: "" };

function fmtFecha(ts){
  try{
    let d = ts;
    if (d?.toDate) d = d.toDate();
    else if (typeof d?.seconds === "number") d = new Date(d.seconds*1000 + Math.floor((d.nanoseconds||0)/1e6));
    else if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleString("es-MX",{year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});
  }catch{ return "—"; }
}

// Formato "sábado 20 de septiembre de 2025"
function fmtDiaLargo(d){
  try{
    return d.toLocaleDateString("es-MX", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  }catch{ return ""; }
}

// Agrupa docs por día YYYY-MM-DD (tz local)
function groupByDay(docSnaps){
  const out = new Map();
  for(const d of docSnaps){
    const r = d.data() || {};
    let t = r.createdAt || r.fechaCreacion || r.fecha || r.timestamp || null;
    try{
      if (t?.toDate) t = t.toDate();
      else if (typeof t?.seconds === "number") t = new Date(t.seconds*1000 + Math.floor((t.nanoseconds||0)/1e6));
      else if (!(t instanceof Date)) t = new Date(t);
    }catch{ t = new Date(0); }
    const key = t.toISOString().slice(0,10); // YYYY-MM-DD
    if (!out.has(key)) out.set(key, []);
    out.get(key).push({snap:d, date:t});
  }
  // Orden descendente por día
  return [...out.entries()].sort((a,b)=> (a[0] < b[0] ? 1 : -1));
}

function renderGroup(keyISO, items){
  const sect = document.createElement("section");
  sect.className = "hist-group";
  const d = (()=>{ try{ return new Date(keyISO+"T00:00:00"); }catch{ return new Date(); } })();
  sect.innerHTML = `<h3 class="hist-group__h">${fmtDiaLargo(d)}</h3>`;
  items
    .sort((a,b)=> b.date - a.date) // dentro del día, más recientes primero
    .forEach(({snap}) => sect.appendChild(renderCard(snap)));
  return sect;
}

function pill(text){ return `<span class="pill">${text}</span>`; }

function renderCard(docSnap){
  const r = docSnap.data() || {};
  const id = docSnap.id;

  const paciente = r.pacienteNombre || r.paciente || r.nombrePaciente || "Paciente sin nombre";
  const medico = r.medicoNombre || r.doctorNombre || r.medico || "—";
  const fecha = r.createdAt || r.fechaCreacion || r.fecha || null;
  const diagnostico = r.diagnostico || r.dx || r.observaciones || "Sin diagnóstico";
  const meds = Array.isArray(r.medicamentos) ? r.medicamentos : (Array.isArray(r.meds) ? r.meds : []);

  const medsHTML = meds.length
    ? meds.map(m=>{
        const n = (m?.nombre || m?.name || "").toString();
        const d = (m?.dosis || m?.dose || "").toString();
        const u = (m?.duracion || m?.duration || "").toString();
        const label = [n,d,u].filter(Boolean).join(" · ");
        return pill(label || "Medicamento");
      }).join("")
    : `<span class="muted">Sin medicamentos registrados.</span>`;

  const el = document.createElement("article");
  el.className = "acordeon";
  el.innerHTML = `
    <div class="acordeon-header" role="button" tabindex="0" aria-expanded="false">
      <span><strong>${paciente}</strong> · <small>${fmtFecha(fecha)}</small></span>
      <span>${medico}</span>
    </div>
    <div class="acordeon-body">
      <p><strong>Diagnóstico:</strong> ${diagnostico}</p>
      <p><strong>Medicamentos:</strong></p>
      <div class="list" style="margin:.25rem 0 .5rem">${medsHTML}</div>
      <a class="boton-ver" href="/medico/ver-receta.html?id=${encodeURIComponent(id)}" rel="noopener">Abrir receta</a>
    </div>
  `;

  const header = el.querySelector(".acordeon-header");

  function toggle(open){
    if (open){
      document.querySelectorAll(".acordeon.open").forEach(n=>{
        if (n !== el){
          n.classList.remove("open");
          const h = n.querySelector(".acordeon-header");
          if (h) h.setAttribute("aria-expanded","false");
        }
      });
      el.classList.add("open");
      header.setAttribute("aria-expanded","true");
    }else{
      el.classList.remove("open");
      header.setAttribute("aria-expanded","false");
    }
  }

  header.addEventListener("click", ()=> toggle(!el.classList.contains("open")));
  header.addEventListener("keydown", (e)=>{
    if (e.key === "Enter" || e.key === " "){
      e.preventDefault();
      toggle(!el.classList.contains("open"));
    }
  });

  return el;
}

function matchLocalFilters(docSnap){
  const r = docSnap.data() || {};
  const paciente = (r.pacienteNombre || r.paciente || r.nombrePaciente || "").toString().toLowerCase();
  const fecha = r.createdAt || r.fechaCreacion || r.fecha || null;

  const iso = (() => {
    try{
      let d = fecha;
      if (d?.toDate) d = d.toDate();
      else if (typeof d?.seconds === "number") d = new Date(d.seconds*1000 + Math.floor((d.nanoseconds||0)/1e6));
      else if (!(d instanceof Date)) d = new Date(d);
      return d.toISOString().slice(0,10);
    }catch{ return ""; }
  })();

  const okNombre = state.nombre ? paciente.includes(state.nombre) : true;
  const okFecha  = state.fechaISO ? (iso === state.fechaISO) : true;
  return okNombre && okFecha;
}

async function buildQuery({ pageStart=null } = {}){
  const parts = [
    collection(db, "recetas"),
    where(OWNER_FIELD, "==", _uid),
    orderBy("createdAt", "desc"),
  ];
  if (pageStart) parts.push(startAfter(pageStart));
  parts.push(limit(PAGE));
  return query(...parts);
}

async function cargar({ append=false } = {}){
  if (!_uid) return;

  let res;
  try{
    res = await getDocs(await buildQuery({ pageStart:_lastSnap }));
  }catch(e){
    console.warn("[HIST] Fallback sin índice:", e?.message || e);
    const q0 = query(collection(db, "recetas"), where(OWNER_FIELD, "==", _uid), limit(PAGE));
    res = await getDocs(q0);
  }

  // Ordenar y filtrar en cliente (ya lo hacíamos)
  const docs = res.docs.slice().sort((a,b)=>{
    const A = a.data()?.createdAt, B = b.data()?.createdAt;
    const ta = A?.toDate ? A.toDate().getTime() : (A?.seconds ? A.seconds*1000 : 0);
    const tb = B?.toDate ? B.toDate().getTime() : (B?.seconds ? B.seconds*1000 : 0);
    return tb - ta;
  });

  // 🔹 Agrupar por día
  const groups = groupByDay(docs.filter(d => matchLocalFilters(d)));

  if (!append) UI.lista.innerHTML = "";
  let totalRendered = 0;
  groups.forEach(([dayKey, items])=>{
    const groupEl = renderGroup(dayKey, items);
    UI.lista.appendChild(groupEl);
    totalRendered += items.length;
  });

  // Paginación server como antes
  if (res.docs.length === PAGE){
    _lastSnap = res.docs[res.docs.length-1];
    UI.btnMas.style.display = "inline-block";
  } else {
    _lastSnap = null;
    UI.btnMas.style.display = "none";
  }

  if (!append && totalRendered === 0){
    UI.lista.innerHTML = `<div class="empty" style="text-align:center; color:#6b7280; padding:1rem">Sin resultados.</div>`;
  }
}


function bindUI(){
  // Buscar por nombre → abre nueva vista
  UI.qNombre?.addEventListener("keydown", (e)=>{
    if (e.key === "Enter"){
      const q = (UI.qNombre.value||"").trim();
      if (q) location.href = `/medico/historial-buscar.html?nombre=${encodeURIComponent(q)}`;
    }
  });

  // Si tienes botón de buscar, lo soportamos también
  document.getElementById("btnBuscar")?.addEventListener("click", ()=>{
    const q = (UI.qNombre.value||"").trim();
    if (q) location.href = `/medico/historial-buscar.html?nombre=${encodeURIComponent(q)}`;
  });

  // Filtro de FECHA se queda en la página principal
  UI.qFecha?.addEventListener("change", ()=>{
    state.fechaISO = (UI.qFecha.value||"").trim();
    _lastSnap = null; cargar({ append:false });
  });

  UI.btnMas?.addEventListener("click", ()=>{
    if (_lastSnap) cargar({ append:true });
  });
}
