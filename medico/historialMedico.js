// /medico/historialMedico.js — agrupado + buscador en nueva pestaña (SDK 12.2.1)
import { auth, db } from "/firebase-init.js";
import {
  collection, query, where, orderBy, limit,
  getDocs, startAfter
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// 🔧 Config
const OWNER_FIELD = "medicoUid";
const PAGE = 15;
const SEARCH_PATH = "/medico/historial-buscar.html"; // 👈 ÚNICA declaración

// UI hooks
const UI = {
  lista: document.getElementById("historialLista"),
  btnMas: document.getElementById("btnMas"),
  qNombre: document.getElementById("buscarNombre"),
  qFecha: document.getElementById("filtrarFecha"),
  btnBuscar: document.getElementById("btnBuscar") || document.querySelector("[data-buscar]")
};

let _uid = null;
let _lastSnap = null;
const state = { fechaISO: "" };

/* -------------------- Helpers -------------------- */
function toDate(ts){
  let d = ts;
  try {
    if (d?.toDate) d = d.toDate();
    else if (typeof d?.seconds === "number") d = new Date(d.seconds*1000 + Math.floor((d.nanoseconds||0)/1e6));
    else if (!(d instanceof Date)) d = new Date(d);
  } catch { d = new Date(0); }
  return d;
}
function fmtFecha(ts){
  const d = toDate(ts);
  return d.toLocaleString("es-MX", { year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" });
}
function diaKey(ts){
  const d = toDate(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function tituloDia(key){
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(`${key}T00:00:00`);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-MX", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}
function pill(t){ return `<span class="pill">${t}</span>`; }

/* -------------------- Render -------------------- */
function renderCard(docSnap){
  const r = docSnap.data() || {};
  const id = docSnap.id;

  const paciente = r.pacienteNombre || r.paciente || r.nombrePaciente || "Paciente sin nombre";
  const medico = r.medicoNombre || r.doctorNombre || r.medico || "—";
  const fecha = r.createdAt || r.fechaCreacion || r.fecha || r.timestamp || null;
  const diagnostico = r.diagnostico || r.dx || r.observaciones || "Sin diagnóstico";
  const meds = Array.isArray(r.medicamentos) ? r.medicamentos : (Array.isArray(r.meds) ? r.meds : []);

  const medsHTML = meds.length
    ? meds.map(m=>{
        const n = (m?.nombre || m?.name || "") + "";
        const d = (m?.dosis  || m?.dose  || "") + "";
        const u = (m?.duracion|| m?.duration|| "") + "";
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
  header.addEventListener("click", ()=>{
    const open = el.classList.contains("open");
    document.querySelectorAll(".acordeon.open").forEach(n=>n.classList.remove("open"));
    if (!open) el.classList.add("open");
  });
  header.addEventListener("keydown", (e)=>{
    if (e.key==="Enter"||e.key===" "){ e.preventDefault(); header.click(); }
  });
  return el;
}

function renderGroup(keyISO, items){
  const sect = document.createElement("section");
  sect.className = "hist-group";
  const count = items.length;
  const openByDefault = (keyISO === diaKey(new Date())); // abre “Hoy”

  sect.innerHTML = `
    <h3 class="hist-group__h" role="button" tabindex="0" aria-expanded="${openByDefault}">
      <span class="hg-dot" aria-hidden="true"></span>
      <span class="hg-title">${tituloDia(keyISO)}</span>
      <span class="hg-count">· ${count} receta${count!==1?"s":""}</span>
      <span class="hg-caret" aria-hidden="true">▾</span>
    </h3>
    <div class="hist-group__body"></div>
  `;
  if (!openByDefault) sect.classList.add("collapsed");

  const body = sect.querySelector(".hist-group__body");
  items.sort((a,b)=> toDate(b.fecha) - toDate(a.fecha))
       .forEach(({snap}) => body.appendChild(renderCard(snap)));

  const hdr = sect.querySelector(".hist-group__h");
  const toggle = ()=>{
    const collapsed = sect.classList.toggle("collapsed");
    hdr.setAttribute("aria-expanded", String(!collapsed));
  };
  hdr.addEventListener("click", toggle);
  hdr.addEventListener("keydown", (e)=>{ if (e.key==="Enter"||e.key===" "){ e.preventDefault(); toggle(); } });

  return sect;
}

/* -------------------- Filtros y queries -------------------- */
function matchDateFilter(docSnap){
  if (!state.fechaISO) return true;
  const r = docSnap.data() || {};
  const f = r.createdAt || r.fechaCreacion || r.fecha || r.timestamp || null;
  return diaKey(f) === state.fechaISO;
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
  try {
    res = await getDocs(await buildQuery({ pageStart:_lastSnap }));
  } catch {
    // Fallback si falta índice
    const q0 = query(collection(db, "recetas"), where(OWNER_FIELD, "==", _uid), limit(PAGE));
    res = await getDocs(q0);
  }

  // Orden global desc
  const docs = res.docs.slice().sort((a,b)=>{
    const ta = toDate(a.data()?.createdAt).getTime();
    const tb = toDate(b.data()?.createdAt).getTime();
    return tb - ta;
  });

  // Bucket por día (aplica filtro de fecha si hay)
  const buckets = new Map();
  docs.forEach(s=>{
    if (!matchDateFilter(s)) return;
    const r = s.data()||{};
    const f = r.createdAt || r.fechaCreacion || r.fecha || r.timestamp || null;
    const key = diaKey(f);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ snap:s, fecha:f });
  });

  // Render
  if (!append) UI.lista.innerHTML = "";
  const ordered = [...buckets.keys()].sort((a,b)=> a<b ? 1 : -1);
  let total = 0;
  ordered.forEach(k=>{
    UI.lista.appendChild(renderGroup(k, buckets.get(k)));
    total += buckets.get(k).length;
  });

  // Paginación
  if (res.docs.length === PAGE){
    _lastSnap = res.docs[res.docs.length-1];
    UI.btnMas && (UI.btnMas.style.display = "inline-block");
  } else {
    _lastSnap = null;
    UI.btnMas && (UI.btnMas.style.display = "none");
  }

  if (!append && total === 0){
    UI.lista.innerHTML = `<div class="empty" style="text-align:center; color:#6b7280; padding:1rem">Sin resultados.</div>`;
  }
}

/* -------------------- UI bindings -------------------- */
function bindUI(){
  // Si falta el botón Buscar, lo creamos junto al “Ver más”
  if (!UI.btnBuscar) {
    const btn = document.createElement("button");
    btn.id = "btnBuscar";
    btn.type = "button";
    btn.textContent = "Buscar";
    btn.className = UI.btnMas?.className || "btn";
    if (UI.btnMas?.parentElement) {
      UI.btnMas.parentElement.insertBefore(btn, UI.btnMas);
    } else {
      (UI.qFecha?.parentElement || UI.qNombre?.parentElement || document.body).appendChild(btn);
    }
    UI.btnBuscar = btn;
  }

const openSearch = ()=>{
  const q = (UI.qNombre?.value || "").trim();
  if (!q) { UI.qNombre?.focus(); return; }
  location.href = `${SEARCH_PATH}?nombre=${encodeURIComponent(q)}`;
};
  
  UI.qNombre?.addEventListener("keydown", (e)=>{ if (e.key === "Enter") openSearch(); });
  UI.btnBuscar?.addEventListener("click", openSearch);

  // Filtro de fecha local
  UI.qFecha?.addEventListener("change", ()=>{
    state.fechaISO = (UI.qFecha.value || "").trim();
    _lastSnap = null;
    cargar({ append:false });
  });

  UI.btnMas?.addEventListener("click", ()=>{ if (_lastSnap) cargar({ append:true }); });
}

/* -------------------- Bootstrap -------------------- */
onAuthStateChanged(auth, (user)=>{
  if (!user){
    window.location.href = "/acceso?role=medico&return=/medico/historial.html";
    return;
  }
  _uid = user.uid;
  bindUI();
  cargar();
});
