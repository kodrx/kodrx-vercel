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

const OWNER_FIELD = "medicoUid";
const PAGE = 15;

async function buildQuery({ pageStart = null } = {}) {
  // Query normal con orderBy createdAt
  try {
    const base = [
      collection(db, "recetas"),
      where(OWNER_FIELD, "==", _uid),
      orderBy("createdAt", "desc"),
      limit(PAGE),
    ];
    if (pageStart) base.splice(3, 0, startAfter(pageStart)); // before limit
    return query(...base);
  } catch (e) {
    // (raro que truene aquí; normalmente truena al getDocs)
    return query(collection(db, "recetas"), where(OWNER_FIELD, "==", _uid), limit(PAGE));
  }
}

async function cargar({ append = false } = {}) {
  if (!_uid) return;
  let qRef = await buildQuery({ pageStart: _lastSnap });

  try {
    const res = await getDocs(qRef);

    // Render normal
    if (!append) UI.lista.innerHTML = "";
    let count = 0;
    res.docs.forEach(d => {
      if (matchLocalFilters(d)) {
        UI.lista.appendChild(renderCard(d));
        count++;
      }
    });

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
  } catch (e) {
    // Probable índice faltante por orderBy createdAt => fallback: sin orderBy y ordenamos en cliente
    console.warn("[HIST] Fallback sin índice:", e?.message || e);
    const res = await getDocs(query(collection(db, "recetas"), where(OWNER_FIELD, "==", _uid), limit(PAGE)));

    // Ordenar en cliente por createdAt desc
    const docs = res.docs.sort((a, b) => {
      const A = a.data()?.createdAt, B = b.data()?.createdAt;
      const ta = A?.toDate ? A.toDate().getTime() : (A?.seconds ? A.seconds*1000 : 0);
      const tb = B?.toDate ? B.toDate().getTime() : (B?.seconds ? B.seconds*1000 : 0);
      return tb - ta;
    });

    if (!append) UI.lista.innerHTML = "";
    let count = 0;
    docs.forEach(d => {
      if (matchLocalFilters(d)) {
        UI.lista.appendChild(renderCard(d));
        count++;
      }
    });

    // En este fallback, deshabilito “Ver más” para no complicar la paginación
    UI.btnMas.style.display = "none";
    _lastSnap = null;

    if (!append && count === 0) {
      UI.lista.innerHTML = `<div class="empty" style="text-align:center; color:#6b7280; padding:1rem">Sin resultados.</div>`;
    }
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
