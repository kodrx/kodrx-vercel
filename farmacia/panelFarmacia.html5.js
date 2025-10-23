// /farmacia/panelFarmacia.html5.js
import { db, auth } from '/firebase-init.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const $ = (s)=>document.querySelector(s);

// UI
const ACCESS_URL = '/acceso?role=farmacia';
const $name      = $('#nombre-farmacia');
const $res       = $('#resultado');
const $btnStart  = $('#btnStart');
const $btnStop   = $('#btnStop');
const $btnOut    = $('#btnLogout');
const $manual    = $('#manual');
const $btnAbrir  = $('#btnAbrir');

// Estado
let datosFarmacia = null;
let recetaGlobal  = null;
let recetaIdActual= null;
let html5qr       = null;
let scanning      = false;

function setNombreFarmacia(txt){ if ($name) $name.textContent = txt || 'Farmacia'; }

function extractId(txt){
  try { const u = new URL(String(txt)); return u.searchParams.get('id') || null; }
  catch {}
  return /^[A-Za-z0-9_-]{8,}$/.test(String(txt)) ? txt : null;
}

function pintarError(msg){ $res.innerHTML = `<div style="padding:10px;background:#fee2e2;color:#991b1b;border-radius:8px">${msg}</div>`; }
function pintarInfo (msg){ $res.innerHTML = `<div style="padding:10px;background:#eef2ff;color:#1e3a8a;border-radius:8px">${msg}</div>`; }

async function loadFarmacia(uid){
  const snap = await getDoc(doc(db, "farmacias", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

function htmlReceta(r){
  const surtido = r.surtidoParcial || [];
  let html = '';
  html += `<h3>Paciente: ${r.nombrePaciente || '—'}</h3>`;
  html += `<p>Edad: ${r.edad || '—'} &nbsp; Sexo: ${r.sexo || '—'} &nbsp; Peso: ${r.peso || '—'} kg &nbsp; Talla: ${r.talla || '—'} cm</p>`;
  html += `<p>IMC: ${r.imc || '—'} &nbsp; TA: ${r.presion || '—'} &nbsp; Temp: ${r.temperatura || '—'}</p>`;
  html += `<p><strong>Diagnóstico:</strong> ${r.diagnostico || '—'}</p>`;
  try {
    const d = r.timestamp?.toDate?.() || (r.timestamp?.seconds ? new Date(r.timestamp.seconds*1000) : (r.timestamp? new Date(r.timestamp): null));
    html += `<p><strong>Fecha:</strong> ${d ? d.toLocaleString('es-MX') : '—'}</p>`;
  } catch { html += `<p><strong>Fecha:</strong> —</p>`; }
  html += `<p><strong>Médico:</strong> ${r.medicoNombre || '—'} &nbsp; <strong>Cédula:</strong> ${r.medicoCedula || '—'}</p>`;
  html += `<p><strong>Especialidad:</strong> ${r.medicoEspecialidad || '—'}</p>`;
  html += `<p><strong>Consultorio:</strong> ${r.medicoDomicilio || '—'}</p>`;

  html += `<h4>Medicamentos:</h4>`;
  if (Array.isArray(r.medicamentos) && r.medicamentos.length){
    r.medicamentos.forEach((m, idx) => {
      const ya = surtido.find(s => s.nombre === m.nombre);
      const disable = ya ? "checked disabled" : "";
      const extra = ya ? `<span class="surtido-info" style="margin-left:8px;color:#065f46">Surtido por: ${ya.surtidoPor}, Tel: ${ya.telefono}</span>` : "";
      html += `<div class="medicamento" style="margin:4px 0">
        <label>
          <input type="checkbox" data-index="${idx}" ${disable}>
          ${m.nombre || '—'} — ${m.dosis || '—'}, ${m.duracion || '—'}
        </label> ${extra}
      </div>`;
    });
  }else{
    html += `<p>—</p>`;
  }

  html += `<div style="margin-top:10px"><button id="btnSurtir" type="button">Surtir</button></div>`;
  return html;
}

async function verifyAndRender(id){
  try{
    const ref = doc(db, "recetas", id);
    const snap = await getDoc(ref);
    if (!snap.exists()){ pintarError('Receta no encontrada.'); return; }

    recetaIdActual = id;
    recetaGlobal   = snap.data();

    $res.innerHTML = htmlReceta(recetaGlobal);
    $('#btnSurtir')?.addEventListener('click', surtirReceta, { once:true });
  }catch(e){
    console.error(e);
    pintarError('No se pudo consultar la receta. Intenta de nuevo.');
  }
}

async function surtirReceta(){
  // Espera breve por datosFarmacia si aún no están
  for (let i=0; i<20 && !datosFarmacia; i++) await new Promise(r=>setTimeout(r,100));

  if (!recetaGlobal || !recetaIdActual || !datosFarmacia) {
    alert("Faltan datos para surtir."); return;
  }

  const checks = Array.from(document.querySelectorAll('input[type="checkbox"]:not(:disabled):checked'));
  const seleccionados = checks.map(c => recetaGlobal.medicamentos[c.dataset.index]);

  if (seleccionados.length === 0) {
    alert("Selecciona al menos un medicamento."); return;
  }

  const nuevos = seleccionados.map(m => ({
    ...m,
    surtidoPor: (datosFarmacia.nombreFarmacia || datosFarmacia.nombre || 'Farmacia'),
    telefono: datosFarmacia.telefono || '',
    fecha: new Date().toISOString()
  }));

  const previos = recetaGlobal.surtidoParcial || [];
  const actualizados = [...previos, ...nuevos];
  const esTotal = Array.isArray(recetaGlobal.medicamentos)
    && actualizados.length >= recetaGlobal.medicamentos.length;

  try{
    await updateDoc(doc(db, "recetas", recetaIdActual), {
      surtidoParcial: actualizados,
      estado: esTotal ? "surtida" : "parcial"
    });
    alert("Receta actualizada.");
    location.reload();
  }catch(e){
    console.error(e);
    alert("No se pudo actualizar la receta (permisos).");
  }
}

// ---------------------------
// Html5Qrcode: iniciar/parar
// ---------------------------
async function startLive(){
  if (scanning) return;
  const Html5QrcodeGlobal = window.Html5Qrcode || globalThis.Html5Qrcode;
  if (!Html5QrcodeGlobal){ alert("El lector QR no está disponible."); return; }

  // Crear instancia si no existe
  if (!html5qr) html5qr = new Html5QrcodeGlobal("qr-reader", /* verbose */ false);

  const config = { fps: 10, qrbox: 240, aspectRatio: 1.333, rememberLastUsedCamera: true };
  const cameraConfig = { facingMode: "environment" }; // con un click dispara el prompt de cámara
  try{
    scanning = true;
    $btnStart.disabled = true; $btnStop.disabled = false;
    await html5qr.start(
      cameraConfig,
      config,
      (decodedText) => {
        try{
          const id = extractId(decodedText) || (new URL(decodedText)).searchParams.get('id');
          if (id){
            stopLive();
            verifyAndRender(id);
          }
        }catch{
          // si decodedText no es URL, prueba directo
          const id2 = extractId(decodedText);
          if (id2){ stopLive(); verifyAndRender(id2); }
        }
      },
      /* onScanFailure */ () => {}
    );
  }catch(e){
    scanning = false;
    $btnStart.disabled = false; $btnStop.disabled = true;
    console.warn('[QR] start error:', e);
    alert('No se pudo abrir la cámara. Si el navegador bloquea el acceso, habilítalo en el candado.');
  }
}

async function stopLive(){
  try{
    if (html5qr && scanning){
      await html5qr.stop();   // detiene cámara y libera tracks
      await html5qr.clear();  // limpia el DOM del contenedor
    }
  }catch{}
  scanning = false;
  $btnStart.disabled = false; $btnStop.disabled = true;
}

// ---------------------------
// Navegación manual
// ---------------------------
function openManual(){
  const v = ($manual?.value || '').trim();
  const id = extractId(v) || v;
  if (!id){ alert('Ingresa una URL o ID de receta válido.'); return; }
  verifyAndRender(id);
}

// ---------------------------
// Logout
// ---------------------------
async function cerrarSesion(){
  try{ await stopLive(); await signOut(auth); }
  finally { location.href = '/acceso?role=farmacia&msg=logout_ok'; }
}

// ---------------------------
// Binds + Guard
// ---------------------------
function bindUI(){
  if ($btnStart && !$btnStart.__b){ $btnStart.__b = true; $btnStart.addEventListener('click', startLive, {capture:true}); }
  if ($btnStop  && !$btnStop.__b) { $btnStop.__b  = true; $btnStop.addEventListener('click', stopLive,  {capture:true}); }
  if ($btnOut   && !$btnOut.__b)  { $btnOut.__b   = true; $btnOut.addEventListener('click', cerrarSesion, {capture:true}); }
  if ($btnAbrir && !$btnAbrir.__b){ $btnAbrir.__b = true; $btnAbrir.addEventListener('click', openManual, {capture:true}); }
}

onAuthStateChanged(auth, async (user)=>{
  bindUI();

  if (!user){ location.href = ACCESS_URL; return; }

  try{
    await user.reload(); await user.getIdToken(true);
    const f = await loadFarmacia(user.uid);
    if (!f){ await signOut(auth); location.href = ACCESS_URL + '&msg=sin_permiso'; return; }

    const estadoCuenta = String(f.estadoCuenta || '').toLowerCase();
    const suspendido   = f.suspendido === true;

    if (suspendido || estadoCuenta === 'suspendido'){
      await signOut(auth); location.href = ACCESS_URL + '&msg=suspendido'; return;
    }
    if (estadoCuenta && estadoCuenta !== 'activo'){
      await signOut(auth); location.href = ACCESS_URL + '&msg=pendiente'; return;
    }

    datosFarmacia = f;
    setNombreFarmacia((f.nombreFarmacia || f.nombre || f.razonSocial || '').trim() || 'Farmacia');
    pintarInfo('Listo para leer un código. Presiona “Escanear en vivo”.');
  }catch(e){
    console.error(e); setNombreFarmacia('—');
  }
});
