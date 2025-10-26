// /farmacia/historialFarmacia.js
import { auth, db } from '/firebase-init.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {
  collection, query, where, orderBy, limit, startAfter, getDocs, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $ = s => document.querySelector(s);
const lista = $('#lista');
const qInput = $('#q');
const btnLimpiar = $('#btnLimpiar');
const btnRecargar = $('#btnRecargar');
const btnMas = $('#btnMas');

const PAGE_SIZE = 25;

let currentUser = null;
let afterCursor = null;
let cacheDocs = [];   // recetas ya “mías” (con surtido de ESTA farmacia)

function fmtDate(dt){
  try{
    if (dt && typeof dt.toDate==='function') dt = dt.toDate();
    else if (dt && typeof dt.seconds==='number') dt = new Date(dt.seconds*1000 + Math.floor((dt.nanoseconds||0)/1e6));
    else if (!(dt instanceof Date)) dt = new Date(dt);
    return dt;
  }catch{ return null; }
}
function ymd(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function badgeEstado(r){
  const st = (r.estado||'').toLowerCase();
  if (st === 'surtida') return '<span class="hx-badge ok">Surtida</span>';
  if (st === 'parcial') return '<span class="hx-badge warn">Parcial</span>';
  return '<span class="hx-badge">Pendiente</span>';
}
function resumenSurtidos(r, myUid){
  const arr = Array.isArray(r.surtidoParcial) ? r.surtidoParcial : [];
  if (!arr.length) return 'Sin surtidos';
  const mine = myUid ? arr.filter(x => x?.farmaciaUid === myUid) : arr;
  const base = mine.length ? mine : arr;
  const dates = base.map(x => new Date(x.fecha || Date.now())).sort((a,b)=>a-b);
  const f1 = dates[0]?.toLocaleString('es-MX');
  const f2 = dates.at(-1)?.toLocaleString('es-MX');
  const farm = base[0]?.surtidoPor || 'Farmacia';
  return base.length > 1
    ? `${farm} — ${base.length} movs. (${f1} → ${f2})`
    : `${farm} — ${f1||'—'}`;
}
function itemHTML(r, myUid){
  const ts = fmtDate(r.timestamp);
  const pac = r.paciente?.nombre ?? r.nombrePaciente ?? '—';
  const meds = Array.isArray(r.medicamentos) ? r.medicamentos : [];
  const medsTxt = meds.map(m => m?.nombre).filter(Boolean).slice(0,3).join(', ');
  const surt = resumenSurtidos(r, myUid);
  const estado = badgeEstado(r);

  return `
  <div class="hx-item">
    <div>
      <div class="hx-badges" style="margin-bottom:6px">${estado} <span class="hx-badge">Solo mis surtidos</span></div>
      <div class="hx-meta"><b>Paciente:</b> ${pac}</div>
      <div class="hx-meta"><b>ID:</b> ${r.id}</div>
      <div class="hx-meta"><b>Fecha:</b> ${ts?ts.toLocaleString('es-MX'):'—'}</div>
      <div class="hx-meta"><b>Medicamentos:</b> ${medsTxt || '—'}</div>
      <div class="hx-meta"><b>Surtido:</b> ${surt}</div>
    </div>
    <div class="hx-actions" style="display:flex;gap:8px;align-items:flex-start">
      <a class="hx-btn" href="/verificar.html?id=${encodeURIComponent(r.id)}" target="_blank" rel="noopener">Ver pública</a>
      <a class="hx-btn" href="/medico/ver-receta.html?id=${encodeURIComponent(r.id)}" target="_blank" rel="noopener">Ver completa</a>
    </div>
  </div>`;
}
function groupByDay(docs){
  const map = new Map();
  for (const r of docs){
    const ts = fmtDate(r.timestamp) || new Date(0);
    const key = ymd(ts);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return Array.from(map.entries())
    .sort((a,b)=> (a[0] < b[0]) ? 1 : -1)
    .map(([day, items]) => ({ day, items: items.sort((a,b)=> (fmtDate(b.timestamp)-fmtDate(a.timestamp))) }));
}
function render(docs){
  const q = (qInput.value||'').trim().toLowerCase();
  let filtered = docs;
  if (q){
    filtered = docs.filter(r=>{
      const pac = (r.paciente?.nombre ?? r.nombrePaciente ?? '').toLowerCase();
      const id  = String(r.id||'').toLowerCase();
      return pac.includes(q) || id.includes(q);
    });
  }
  const groups = groupByDay(filtered);
  if (!groups.length){
    lista.innerHTML = `<div class="hx-acc"><div class="hx-acc-body">No hay recetas surtidas por esta farmacia.</div></div>`;
    return;
  }
  lista.innerHTML = groups.map(g => `
    <details class="hx-acc" ${q ? 'open' : ''}>
      <summary class="hx-acc-sum"><b>${g.day}</b><span>${g.items.length} receta(s)</span></summary>
      <div class="hx-acc-body">
        ${g.items.map(r => itemHTML(r, currentUser?.uid)).join('')}
      </div>
    </details>
  `).join('');
}

async function loadPage(reset=false){
  if (!currentUser) return;
  if (reset){ afterCursor = null; cacheDocs = []; }

  // Trae solo candidatas (parcial/surtida) y pagina por timestamp
  let qRef = query(
    collection(db, 'recetas'),
    where('estado', 'in', ['parcial','surtida']),
    orderBy('timestamp', 'desc'),
    limit(PAGE_SIZE)
  );
  if (afterCursor) {
    qRef = query(
      collection(db, 'recetas'),
      where('estado', 'in', ['parcial','surtida']),
      orderBy('timestamp', 'desc'),
      startAfter(afterCursor),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(qRef);
  const docs = snap.docs.map(d => ({ id:d.id, ...d.data() }));

  // 🔎 Mantener SOLO recetas donde ESTA farmacia surtió algo
  const myUid = currentUser.uid;
  const mine = docs.filter(r =>
    Array.isArray(r.surtidoParcial) &&
    r.surtidoParcial.some(x => x?.farmaciaUid === myUid)
  );

  cacheDocs.push(...mine);
  render(cacheDocs);

  afterCursor = snap.docs.length ? snap.docs[snap.docs.length-1] : null;
  btnMas.disabled = !afterCursor;
}

// Guard de sesión + verificación de farmacia
async function ensureFarmacia(uid){
  const snap = await getDoc(doc(db,'farmacias',uid));
  if (!snap.exists()){
    await signOut(auth);
    location.href = '/acceso?role=farmacia&msg=sin_permiso';
    return false;
  }
  const d = snap.data()||{};
  const estadoCuenta = String(d.estadoCuenta||'').toLowerCase();
  const suspendido = d.suspendido === true;
  if (suspendido || (estadoCuenta && estadoCuenta!=='activo')){
    await signOut(auth);
    location.href = '/acceso?role=farmacia&msg=suspendido';
    return false;
  }
  return true;
}

// Boot
onAuthStateChanged(auth, async (u)=>{
  if (!u){ location.href='/acceso?role=farmacia'; return; }
  currentUser = u;
  await u.reload(); await u.getIdToken(true);
  const ok = await ensureFarmacia(u.uid);
  if (!ok) return;
  await loadPage(true);
});

// UI
qInput?.addEventListener('input', ()=>render(cacheDocs));
btnLimpiar?.addEventListener('click', ()=>{ qInput.value=''; render(cacheDocs); });
btnRecargar?.addEventListener('click', ()=>loadPage(true));
btnMas?.addEventListener('click', ()=>loadPage(false));

