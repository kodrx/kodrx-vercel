// /farmacia/verificador.js
import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {
  doc, getDoc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $ = s => document.querySelector(s);
const video = $('#cam'); const frame = $('#frame'); const msg = $('#camMsg'); const $res = $('#resultado');
const btnCam = $('#btnCam'); const btnAbrir = $('#btnAbrir'); const manual = $('#manual');

let currentUser = null, farmaciaInfo = null, raf = 0, live = false, stream = null, recetaSnap = null, recetaId = null;

onAuthStateChanged(auth, async (user)=>{
  if (!user){ location.href = '/acceso?role=farmacia'; return; }
  currentUser = user;
  try{
    const fs = await getDoc(doc(db,'farmacias', user.uid));
    if (fs.exists()) farmaciaInfo = fs.data(); else farmaciaInfo = {};
  }catch{}
  // Si venimos con ?id, carga directa:
  const id = new URLSearchParams(location.search).get('id');
  if (id) { manual.value = id; await abrirManual(); }
});

btnAbrir?.addEventListener('click', abrirManual);
async function abrirManual(){
  const raw = (manual.value||'').trim();
  const id = extractId(raw) || (safeURL(raw)?.searchParams.get('id'));
  if (!id){ alert('ID o URL inválidos'); return; }
  await stopLive();
  await loadAndRender(id);
}

btnCam?.addEventListener('click', async ()=>{
  await stopLive();
  await startLive();
});

/* ========== Scanner ========== */
async function startLive(){
  try{
    const st = await camPerm();
    if (st==='denied') alert('La cámara está bloqueada. Actívala en el candado de la barra y vuelve a intentar.');
  }catch{}

  const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
  stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream; video.muted = true; video.setAttribute('playsinline','true');
  await video.play(); live = true; msg.textContent = 'Cámara activa. Apunta al QR de la receta.';
  if ('BarcodeDetector' in window) detectLoopBD(); else detectLoopJsQR();
}
async function stopLive(){
  live = false; cancelAnimationFrame(raf);
  try{ await video.pause(); }catch{}
  if (stream){ try{ stream.getTracks().forEach(t=>t.stop()); }catch{} }
  stream = null; msg.textContent = '';
}
async function camPerm(){
  if (!navigator.permissions) return 'unknown';
  try{ return (await navigator.permissions.query({name:'camera'})).state; } catch{ return 'unknown'; }
}
function detectLoopBD(){
  const det = new window.BarcodeDetector({ formats:['qr_code'] });
  const loop = async ()=>{
    try{
      if (!live) return;
      if (video.readyState>=2){
        const bmp = await createImageBitmap(video);
        const codes = await det.detect(bmp); bmp.close?.();
        if (codes?.length){
          const raw = codes[0].rawValue||'';
          const id = extractId(raw) || safeURL(raw)?.searchParams.get('id');
          if (id){ await stopLive(); await loadAndRender(id); return; }
        }
      }
    }catch{}
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function detectLoopJsQR(){
  const canvas = frame; const ctx = canvas.getContext('2d',{willReadFrequently:true});
  const loop = ()=>{
    try{
      if (!live) return;
      const w = video.videoWidth, h = video.videoHeight;
      if (w&&h){
        canvas.width=w; canvas.height=h;
        ctx.drawImage(video,0,0,w,h);
        const img = ctx.getImageData(0,0,w,h);
        const res = window.jsQR && window.jsQR(img.data,w,h,{ inversionAttempts:'dontInvert' });
        if (res?.data){
          const raw=res.data;
          const id = extractId(raw) || safeURL(raw)?.searchParams.get('id');
          if (id){ stopLive().then(()=>loadAndRender(id)); return; }
        }
      }
    }catch{}
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function extractId(txt){
  if (!txt) return null;
  if (/^[A-Za-z0-9_-]{12,}$/.test(txt)) return txt;
  return null;
}
function safeURL(txt){ try{ return new URL(txt); }catch{ return null; } }

/* ========== Carga + Render ========== */
async function loadAndRender(id){
  recetaId = id;
  try{
    recetaSnap = await getDoc(doc(db,'recetas', id));
    if (!recetaSnap.exists()){
      $res.innerHTML = `<div class="warn">Receta no encontrada.</div>`;
      return;
    }
    const r = normalize(recetaSnap.data(), recetaSnap.id);
    renderReceta(r);
  }catch(e){
    console.error('[VERIF] load err', e);
    $res.innerHTML = `<div class="warn">No se pudo cargar la receta.</div>`;
  }
}
function normalize(raw0={}, id){
  const raw={...raw0}; raw.id = id || raw0.id;
  // compat
  const paciente = {
    nombre: raw.paciente?.nombre ?? raw.nombrePaciente ?? raw.pacienteNombre ?? '—',
    edad:   raw.paciente?.edad   ?? raw.edad ?? '—',
    sexo:   raw.paciente?.sexo   ?? raw.sexo ?? '—',
    peso:   raw.paciente?.peso   ?? raw.peso ?? '—',
    talla:  raw.paciente?.talla  ?? raw.talla ?? '—',
    temperatura: raw.paciente?.temperatura ?? raw.temperatura ?? '—',
    presion:     raw.paciente?.presion     ?? raw.presion ?? '—',
    imc:         raw.paciente?.imc         ?? raw.imc ?? '—',
  };
  const medico = {
    nombre: raw.medico?.nombre ?? raw.medicoNombre ?? '—',
    genero: raw.medico?.genero ?? raw.medicoGenero ?? '',
    cedula: raw.medico?.cedula ?? raw.medicoCedula ?? '—',
    especialidad: raw.medico?.especialidad ?? raw.medicoEspecialidad ?? 'General',
    telefono: raw.medico?.telefono ?? raw.medicoTelefono ?? '',
    direccion: raw.medico?.direccion ?? raw.medicoDomicilio ?? ''
  };
  const meds = Array.isArray(raw.medicamentos) ? raw.medicamentos : [];
  const surt = Array.isArray(raw.surtidoParcial) ? raw.surtidoParcial : [];
  return { ...raw, paciente, medico, medicamentos: meds, surtidoParcial: surt };
}
function renderReceta(r){
  const surt = r.surtidoParcial || [];
  const yaPorNombre = new Set(surt.map(s=>String(s.nombre||'').trim().toLowerCase()));

  const medsHTML = r.medicamentos.map((m,i)=>{
    const key = String(m.nombre||'').trim().toLowerCase();
    const ya  = yaPorNombre.has(key);
    const extra = ya
      ? `<span class="sub" style="color:#065f46">Ya surtido</span>`
      : '';
    const dis = ya ? 'disabled checked' : '';
    return `
    <div class="med-row" style="padding:8px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px">
      <label style="display:flex;gap:8px;align-items:start">
        <input type="checkbox" data-index="${i}" ${dis}>
        <span>
          <div><b>${escapeHTML(m.nombre||'')}</b></div>
          <div class="sub">Dosis: ${escapeHTML(m.dosis||'—')} · Duración: ${escapeHTML(m.duracion||'—')}</div>
          ${extra}
        </span>
      </label>
    </div>`;
  }).join('');

  const fecha = fechaStr(r.timestamp);

  $res.innerHTML = `
  <div class="grid" style="display:grid;gap:12px;grid-template-columns:1.1fr .9fr">
    <div>
      <div class="card" style="padding:10px;border:1px solid #e5e7eb;border-radius:12px">
        <div class="title">Paciente</div>
        <div><b>${escapeHTML(r.paciente.nombre||'—')}</b></div>
        <div class="sub">Edad: ${escapeHTML(r.paciente.edad)} · Sexo: ${escapeHTML(r.paciente.sexo)}</div>
        <div class="sub">Peso: ${escapeHTML(r.paciente.peso)} · Talla: ${escapeHTML(r.paciente.talla)} · IMC: ${escapeHTML(r.paciente.imc)}</div>
        <div class="sub">PA: ${escapeHTML(r.paciente.presion)} · Temp: ${escapeHTML(r.paciente.temperatura)}</div>
        <div class="sub">Fecha: ${escapeHTML(fecha)}</div>
        <div class="sub">ID: ${escapeHTML(r.id || '')}</div>
        <div style="margin-top:10px">
          <div class="title">Diagnóstico</div>
          <div>${escapeHTML(r.diagnostico||'—')}</div>
        </div>
        <div style="margin-top:10px">
          <div class="title">Observaciones</div>
          <div>${escapeHTML(r.observaciones||'—')}</div>
        </div>
      </div>

      <div class="card" style="padding:10px;border:1px solid #e5e7eb;border-radius:12px;margin-top:12px">
        <div class="title">Médico</div>
        <div><b>${prefMed(r.medico.nombre, r.medico.genero)}</b></div>
        <div class="sub">Cédula: ${escapeHTML(r.medico.cedula)}</div>
        <div class="sub">Especialidad: ${escapeHTML(r.medico.especialidad)}</div>
        <div class="sub">Tel: ${escapeHTML(r.medico.telefono)}</div>
        <div class="sub">Dirección: ${escapeHTML(r.medico.direccion)}</div>
      </div>
    </div>

    <div>
      <div class="card" style="padding:10px;border:1px solid #e5e7eb;border-radius:12px">
        <div class="title">Medicamentos (selecciona los que surtes ahora)</div>
        ${medsHTML || '<div class="sub">—</div>'}
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
          <button id="btnGuardar" type="button">💾 Guardar</button>
          <button id="btnReiniciar" type="button">🔄 Reiniciar cámara</button>
          <a class="btn" href="/farmacia/panel.html">Volver</a>
        </div>
        <div class="sub" style="margin-top:6px;color:#6b7280">
          * Puedes surtir parcialmente. La receta quedará marcada y podrás completar después.
        </div>
      </div>
    </div>
  </div>`;

  $('#btnReiniciar')?.addEventListener('click', async ()=>{ await stopLive(); await startLive(); });
  $('#btnGuardar')?.addEventListener('click', onGuardar, {once:true});
}

async function onGuardar(){
  if (!recetaId || !recetaSnap?.exists()) return alert('Falta receta.');
  const r = normalize(recetaSnap.data(), recetaSnap.id);
  const checks = Array.from(document.querySelectorAll('input[type=checkbox][data-index]:not(:disabled):checked'));
  if (!checks.length){ alert('Selecciona al menos un medicamento para surtir.'); $('#btnGuardar').addEventListener('click', onGuardar, {once:true}); return; }

  // preparar movimientos nuevos (evita duplicado por nombre)
  const yaNombres = new Set((r.surtidoParcial||[]).map(s=>String(s.nombre||'').trim().toLowerCase()));
  const nuevos = [];
  for (const c of checks){
    const m = r.medicamentos[Number(c.dataset.index)];
    if(!m) continue;
    const key = String(m.nombre||'').trim().toLowerCase();
    if (yaNombres.has(key)) continue;
    nuevos.push({
      nombre: m.nombre||'',
      dosis: m.dosis||'',
      duracion: m.duracion||'',
      surtidoPor: farmaciaInfo?.nombreFarmacia || farmaciaInfo?.nombre || 'Farmacia',
      farmaciaUid: currentUser?.uid || null,
      telefono: farmaciaInfo?.telefono || '',
      fechaISO: new Date().toISOString()
    });
  }
  const prev = Array.isArray(r.surtidoParcial) ? r.surtidoParcial : [];
  const merged = [...prev, ...nuevos];

  const totalLen = (r.medicamentos||[]).length;
  const estado = merged.length >= totalLen && totalLen>0 ? 'surtida' : 'parcial';

  try{
    await updateDoc(doc(db,'recetas', recetaId), {
      surtidoParcial: merged,
      estado,
      ultimaDispensa: serverTimestamp(),
      dispensasCount: (r.dispensasCount|0) + 1
    });
    alert(estado==='surtida' ? 'Receta surtida por completo.' : 'Surtido parcial guardado.');
    location.href = '/farmacia/panel.html';
  }catch(e){
    console.error('[VERIF] save err', e);
    alert('No se pudo guardar el surtido.');
    // permitir reintento
    $('#btnGuardar')?.addEventListener('click', onGuardar, {once:true});
  }
}

/* ========== utils ========== */
function prefMed(nombre,genero){
  if(!nombre) return '—';
  const g=String(genero||'').toLowerCase();
  return (g.startsWith('f')?'Dra. ':'Dr. ') + nombre;
}
function fechaStr(ts){
  try{
    if (ts && typeof ts.toDate==='function') ts=ts.toDate();
    else if (ts && typeof ts.seconds==='number') ts=new Date(ts.seconds*1000 + Math.floor((ts.nanoseconds||0)/1e6));
    else if (!(ts instanceof Date)) ts = new Date(ts);
    return ts ? ts.toLocaleString('es-MX',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
  }catch{ return '—'; }
}
function escapeHTML(s){
  return String(s??'').replace(/[&<>"']/g,(c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
