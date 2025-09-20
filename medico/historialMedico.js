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

  const VISIBLE_EMPTY = `<div class="empty" style="text-align:center; color:#6b7280; padding:1rem; background:#fff; border:1px dashed #cfd6e3; border-radius:10px">Sin resultados para este médico.</div>`;

  let res, usedFallback = false;

  try{
    console.info("[HIST] uid=", _uid, "OWNER_FIELD=medicoUid");
    res = await getDocs(await buildQuery({ pageStart:_lastSnap }));
    console.info("[HIST] query (medicoUid + orderBy createdAt) → docs:", res.size);
  }catch(e){
    console.warn("[HIST] getDocs falló (prob. índice). Activando fallback sin orderBy:", e?.message||e);
    // Fallback: sin orderBy (ordenaremos en cliente)
    const q0 = query(collection(db, "recetas"), where(OWNER_FIELD, "==", _uid), limit(PAGE));
    res = await getDocs(q0);
    usedFallback = true;
  }

  if (!append) UI.lista.innerHTML = "";
  let count = 0;

  // Si no trajo nada, haz un "sondeo" (sin where) para ayudarnos a ver si hay docs y cómo vienen
  if (res.empty){
    console.warn("[HIST] 0 docs para medicoUid == uid. Ejecutando SONDEO (sin filtro) limit 3…");
    try{
      const s = await getDocs(query(collection(db, "recetas"), limit(3)));
      console.info("[HIST] SONDEO size:", s.size);
      s.forEach((d,i)=> console.info(`[HIST] SONDEO[${i}] id=${d.id}`, d.data()));
      if (!append) UI.lista.innerHTML = VISIBLE_EMPTY;
      UI.btnMas.style.display = "none";
      _lastSnap = null;
      return;
    }catch(e2){
      console.error("[HIST] SONDEO falló:", e2?.message||e2);
      if (!append) UI.lista.innerHTML = VISIBLE_EMPTY;
      UI.btnMas.style.display = "none";
      _lastSnap = null;
      return;
    }
  }

  // Ordenamos en cliente si venimos del fallback
  const docs = (usedFallback ? res.docs.slice().sort((a,b)=>{
    const A = a.data()?.createdAt, B = b.data()?.createdAt;
    const ta = A?.toDate ? A.toDate().getTime() : (A?.seconds ? A.seconds*1000 : 0);
    const tb = B?.toDate ? B.toDate().getTime() : (B?.seconds ? B.seconds*1000 : 0);
    return tb - ta;
  }) : res.docs);

  // Pinta tarjetas
  docs.forEach(d=>{
    if (matchLocalFilters(d)){
      UI.lista.appendChild(renderCard(d));
      count++;
    }
  });

  // Paginación
  if (res.docs.length === PAGE){
    _lastSnap = res.docs[res.docs.length-1];
    UI.btnMas.style.display = "inline-block";
  }else{
    _lastSnap = null;
    UI.btnMas.style.display = "none";
  }

  if (!append && count === 0){
    UI.lista.innerHTML = VISIBLE_EMPTY;
  }
}

function bindUI(){
  UI.qNombre?.addEventListener("input", ()=>{
    state.nombre = (UI.qNombre.value||"").trim().toLowerCase();
    _lastSnap = null; cargar({ append:false });
  });
  UI.qFecha?.addEventListener("change", ()=>{
    state.fechaISO = (UI.qFecha.value||"").trim();
    _lastSnap = null; cargar({ append:false });
  });
  UI.btnMas?.addEventListener("click", ()=>{
    if (_lastSnap) cargar({ append:true });
  });
}

onAuthStateChanged(auth, (user)=>{
  if (!user){
    window.location.href = "/acceso?role=medico&return=/medico/historial.html";
    return;
  }
  _uid = user.uid;
  bindUI();
  cargar();
});

