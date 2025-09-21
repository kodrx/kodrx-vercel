// /medico/historialBuscar.js — SDK 12.2.1
import { auth, db } from "/firebase-init.js";
import {
  collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Reutilizamos helpers ligeros
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
  header.addEventListener("click", ()=> {
    const open = el.classList.contains("open");
    document.querySelectorAll(".acordeon.open").forEach(n=>n.classList.remove("open"));
    if (!open) el.classList.add("open");
  });
  header.addEventListener("keydown", (e)=>{
    if (e.key==="Enter"||e.key===" "){ e.preventDefault(); header.click(); }
  });
  return el;
}

const UI = {
  lista: document.getElementById("lista"),
  queryTxt: document.getElementById("queryTxt"),
  countTxt: document.getElementById("countTxt"),
  buscar: document.getElementById("buscarNombre"),
};

const qs = new URLSearchParams(location.search);
const qNombre = (qs.get("nombre")||"").trim();

UI.queryTxt.textContent = qNombre ? `Paciente contiene: “${qNombre}”` : "Sin término de búsqueda.";
UI.buscar.value = qNombre;

function matchByName(docSnap, needle){
  const r = docSnap.data() || {};
  const paciente = (r.pacienteNombre || r.paciente || r.nombrePaciente || "").toString().toLowerCase();
  return needle ? paciente.includes(needle.toLowerCase()) : true;
}

async function cargar(uid){
  const res = await getDocs(query(
    collection(db,"recetas"),
    where("medicoUid","==", uid),
    orderBy("createdAt","desc"),
    limit(200) // suficiente para 160 docs; ajusta si crece
  ));

  const docs = res.docs.filter(d => matchByName(d, qNombre));
  UI.lista.innerHTML = "";
  docs.forEach(d => UI.lista.appendChild(renderCard(d)));
  UI.countTxt.textContent = `${docs.length} resultado(s)`;
}

// Buscar de nuevo desde esta vista
document.getElementById("btnBuscar")?.addEventListener("click", ()=>{
  const v = (UI.buscar.value||"").trim();
  if (v) location.href = `/medico/historial-buscar.html?nombre=${encodeURIComponent(v)}`;
});
UI.buscar?.addEventListener("keydown", (e)=>{
  if (e.key === "Enter"){
    const v = (UI.buscar.value||"").trim();
    if (v) location.href = `/medico/historial-buscar.html?nombre=${encodeURIComponent(v)}`;
  }
});

onAuthStateChanged(auth, (user)=>{
  if (!user){
    location.href = "/acceso?role=medico&return=/medico/historial-buscar.html";
    return;
  }
  cargar(user.uid);
});
