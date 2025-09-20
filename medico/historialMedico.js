// /medico/historialMedico.js — Historial Médico (SDK 12.2.1)
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
let _filters = { nombre: "", fechaISO: "" };
let _uid = null;

const PAGE = 15;

function fmtFecha(ts) {
  try {
    let d = ts;
    if (d?.toDate) d = d.toDate();
    else if (typeof d?.seconds === "number") d = new Date(d.seconds * 1000 + Math.floor((d.nanoseconds || 0) / 1e6));
    else if (!(d instanceof Date)) d = new Date(d);
    return d.toLocaleString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function pill(text) {
  return `<span class="pill">${text}</span>`;
}

function renderCard(doc) {
  const r = doc.data() || {};
  const id = doc.id;

  // Fallbacks robustos
  const paciente = r.pacienteNombre || r.paciente || r.nombrePaciente || "Paciente sin nombre";
  const medico = r.medicoNombre || r.doctorNombre || r.medico || "—";
  const fecha = r.createdAt || r.fechaCreacion || r.fecha || null;
  const diagnostico = r.diagnostico || r.dx || r.observaciones || "Sin diagnóstico";
  const meds = Array.isArray(r.medicamentos) ? r.medicamentos :
               (Array.isArray(r.meds) ? r.meds : []);

  const medsHTML = meds.length
    ? meds.map(m => {
        const n = (m?.nombre || m?.name || "").toString();
        const d = (m?.dosis || m?.dose || "").toString();
        const u = (m?.duracion || m?.duration || "").toString();
        const label = [n, d, u].filter(Boolean).join(" · ");
        return pill(label || "Medicamento");
      }).join("")
    : `<span class="muted">Sin medicamentos registrados.</span>`;

  // Acordeón
  const card = document.createElement("article");
  card.className = "acordeon";
  card.innerHTML = `
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

  const header = card.querySelector(".acordeon-header");
  const body = card.querySelector(".acordeon-body");

  function toggle(open) {
    if (open) {
      // cerrar otros
      document.querySelectorAll(".acordeon.open").forEach(n => {
        if (n !== card) {
          n.classList.remove("open");
          const h = n.querySelector(".acordeon-header");
          if (h) h.setAttribute("aria-expanded", "false");
        }
      });
      card.classList.add("open");
      header.setAttribute("aria-expanded", "true");
    } else {
      card.classList.remove("open");
      header.setAttribute("aria-expanded", "false");
    }
  }

  header.addEventListener("click", () => toggle(!card.classList.contains("open")));
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(!card.classList.contains("open"));
    }
  });

  return card;
}

async function buildQuery({ pageStart = null } = {}) {
  // Base: recetas del médico autenticado
  // Ajusta el campo según tu esquema: medicoUid | doctorUid | createdBy
  let qBase = query(
    collection(db, "recetas"),
    where("medicoUid", "==", _uid),
    orderBy("createdAt", "desc"),
    limit(PAGE)
  );

  // Paginación
  if (pageStart) {
    qBase = query(
      collection(db, "recetas"),
      where("medicoUid", "==", _uid),
      orderBy("createdAt", "desc"),
      startAfter(pageStart),
      limit(PAGE)
    );
  }

  return qBase;
}

function matchLocalFilters(docSnap) {
  // Filtro por nombre (cliente) y fecha exacta (YYYY-MM-DD)
  const r = docSnap.data() || {};
  const paciente = (r.pacienteNombre || r.paciente || r.nombrePaciente || "").toString().toLowerCase();
  const fecha = r.createdAt || r.fechaCreacion || r.fecha || null;
  const iso = (() => {
    try {
      let d = fecha;
      if (d?.toDate) d = d.toDate();
      else if (typeof d?.seconds === "number") d = new Date(d.seconds * 1000 + Math.floor((d.nanoseconds || 0) / 1e6));
      else if (!(d instanceof Date)) d = new Date(d);
      return d.toISOString().slice(0, 10);
    } catch { return ""; }
  })();

  const okNombre = _filters.nombre ? paciente.includes(_filters.nombre) : true;
  const okFecha = _filters.fechaISO ? (iso === _filters.fechaISO) : true;

  return okNombre && okFecha;
}

async function cargar({ append = false } = {}) {
  if (!_uid) return;

  // 1) Query base (paginada)
  const qRef = await buildQuery({ pageStart: _lastSnap });
  const res = await getDocs(qRef);

  // 2) Render
  if (!append) UI.lista.innerHTML = "";
  let count = 0;

  res.docs.forEach(d => {
    if (matchLocalFilters(d)) {
      UI.lista.appendChild(renderCard(d));
      count++;
    }
  });

  // 3) Control “Ver más”
  if (res.docs.length === PAGE) {
    _lastSnap = res.docs[res.docs.length - 1];
    UI.btnMas.style.display = "inline-block";
  } else {
    _lastSnap = null;
    UI.btnMas.style.display = "none";
  }

  if (!append && count === 0) {
    UI.lista.innerHTML = `<div class="empty" style="text-align:center; color:#6b7280; padding:1rem">Sin resultados.</div>`;
  }
}

function bindUI() {
  UI.qNombre?.addEventListener("input", () => {
    _filters.nombre = (UI.qNombre.value || "").trim().toLowerCase();
    _lastSnap = null;
    cargar({ append: false });
  });

  UI.qFecha?.addEventListener("change", () => {
    _filters.fechaISO = (UI.qFecha.value || "").trim();
    _lastSnap = null;
    cargar({ append: false });
  });

  UI.btnMas?.addEventListener("click", () => {
    if (_lastSnap) cargar({ append: true });
  });
}

// Bootstrap (auth + primera carga)
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/acceso?role=medico&return=/medico/historial.html";
    return;
  }
  _uid = user.uid;
  bindUI();
  cargar();
});
