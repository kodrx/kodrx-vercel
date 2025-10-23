// /farmacia/panelFarmacia.js
import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const ACCESS_URL = '/acceso?role=farmacia';
const $ = (s)=>document.querySelector(s);

// UI nodes
const $name     = $('#nombre-farmacia');
const $video    = $('#cam');
const $btnScan  = $('#btnScan');
const $btnPick  = $('#btnPick');
const $fileQR   = $('#fileQR');
const $manual   = $('#manual');
const $btnAbrir = $('#btnAbrir');
const $btnOut   = $('#btnLogout');

// --------------------------------------------------
// Utilidades
// --------------------------------------------------
function setNombreFarmacia(txt){ if ($name) $name.textContent = txt || 'Farmacia'; }

function extractId(txt){
  try { const u = new URL(txt); return u.searchParams.get('id') || null; }
  catch {}
  return /^[A-Za-z0-9_-]{8,}$/.test(txt) ? txt : null;
}

function go(id){
  if (!id){ alert('No se pudo leer el código'); return; }
  // Verificador de farmacia:
  location.href = `/farmacia/verificador.html?id=${encodeURIComponent(id)}`;
  // Si prefieres ver receta:
  // location.href = `/medico/ver-receta.html?id=${encodeURIComponent(id)}`;
}

// --------------------------------------------------
// Cámara: control ciclo
// --------------------------------------------------
let _rafId = 0;
function stopScan(){
  try { cancelAnimationFrame(_rafId); } catch {}
  _rafId = 0;
  try {
    const s = $video?.srcObject;
    if (s && s.getTracks) s.getTracks().forEach(t=>t.stop());
  } catch {}
  if ($video) $video.srcObject = null;
  if ($btnScan){ $btnScan.textContent = '🎥 Escanear en vivo'; $btnScan.dataset.state = 'off'; }
}

async function runWithBarcodeDetector(){
  const det = new window.BarcodeDetector({ formats: ['qr_code'] });
  const loop = async () => {
    try{
      if ($video.readyState >= 2) {
        const bmp = await createImageBitmap($video);
        const codes = await det.detect(bmp);
        bmp.close?.();
        if (codes && codes.length) {
          const raw = codes[0].rawValue || '';
          const id = extractId(raw) || raw;
          stopScan();
          return go(id);
        }
      }
    }catch(e){
      if (window.jsQR) return runWithJsQR(); // fallback suave
    }
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

async function runWithJsQR(){
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently:true });

  const loop = () => {
    try{
      const w = $video.videoWidth, h = $video.videoHeight;
      if (w && h){
        canvas.width = w; canvas.height = h;
        ctx.drawImage($video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const res = window.jsQR && window.jsQR(img.data, w, h, { inversionAttempts:'dontInvert' });
        if (res?.data){
          const id = extractId(res.data) || res.data;
          stopScan();
          return go(id);
        }
      }
    }catch{}
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

async function startScan(){
  // Si ya está ON, pulsar el botón la apaga
  if ($btnScan?.dataset.state === 'on'){ stopScan(); return; }

  try{
    // Autoplay friendly antes del play
    $video.setAttribute('playsinline','true');
    $video.muted = true;

    // 1) warm-up para disparar prompt (habilita labels)
    const warm = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    warm.getTracks().forEach(t=>t.stop());

    // 2) enumerar y elegir trasera
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams = devs.filter(d=>d.kind==='videoinput');
    const back = cams.find(d=>/back|rear|environment/i.test(d.label)) || cams[0];
    if (!back) throw new Error('NoCamera');

    // 3) intento exacto + fallback facingMode
    let stream;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: back.deviceId } }, audio:false
      });
    }catch{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal:'environment' } }, audio:false
      });
    }

    $video.srcObject = stream;
    await $video.play();

    if ($btnScan){ $btnScan.textContent = '■ Detener cámara'; $btnScan.dataset.state = 'on'; }

    if ('BarcodeDetector' in window) await runWithBarcodeDetector();
    else if (window.jsQR)          await runWithJsQR();
    else                           alert('No hay lector disponible. Usa “📸 Escanear (Foto)”.');

  }catch(err){
    console.warn('[SCAN] getUserMedia:', err?.name || err?.message || err);
    const m = String(err?.name || err?.message || '');
    if (/NotAllowed|Permission/i.test(m)) {
      alert('La cámara está bloqueada por el navegador o el sistema. Pulsa el candado y permite “Cámara”, o usa “📸 Escanear (Foto)”.');
    } else if (/NotFound|NoCamera/i.test(m)) {
      alert('No se encontró cámara en este dispositivo.');
    } else {
      alert('No se pudo acceder a la cámara. Usa “📸 Escanear (Foto)”.');
    }
    stopScan();
  }
}

// Detener si la pestaña se oculta
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) stopScan(); });

// --------------------------------------------------
// Fallback: foto con jsQR (no requiere gUM)
// --------------------------------------------------
function onPickImage(e){
  const file = e.target.files?.[0];
  if (!file) return;
  if (!window.jsQR){ alert('No se pudo cargar el lector offline (jsQR).'); return; }

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently:true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const res = window.jsQR(data.data, canvas.width, canvas.height, { inversionAttempts:'dontInvert' });
    if (res?.data){
      const id = extractId(res.data) || res.data;
      go(id);
    }else{
      alert('No se pudo leer el QR de la imagen. Asegúrate de que esté enfocada y con buena luz.');
    }
    URL.revokeObjectURL(img.src);
  };
  img.onerror = ()=>alert('No se pudo abrir la imagen seleccionada.');
  img.src = URL.createObjectURL(file);
}

// --------------------------------------------------
// Navegación manual
// --------------------------------------------------
function openManual(){
  const v = ($manual?.value || '').trim();
  const id = extractId(v) || v;
  if (!id){ alert('Ingresa una URL o ID de receta válido.'); return; }
  go(id);
}

// --------------------------------------------------
// Logout
// --------------------------------------------------
async function cerrarSesion(){
  try { stopScan(); await signOut(auth); }
  finally { location.href = '/acceso?role=farmacia&msg=logout_ok'; }
}

// --------------------------------------------------
// Bind UI (idempotente)
// --------------------------------------------------
function bindUI(){
  if ($btnScan && !$btnScan.__b){ $btnScan.__b = true; $btnScan.type='button'; $btnScan.addEventListener('click', startScan, {capture:true}); }
  if ($btnPick && !$btnPick.__b){ $btnPick.__b = true; $btnPick.type='button'; $btnPick.addEventListener('click', ()=> $fileQR?.click(), {capture:true}); }
  if ($fileQR && !$fileQR.__b){ $fileQR.__b = true; $fileQR.addEventListener('change', onPickImage, {capture:true}); }
  if ($btnAbrir && !$btnAbrir.__b){ $btnAbrir.__b = true; $btnAbrir.type='button'; $btnAbrir.addEventListener('click', openManual, {capture:true}); }
  if ($btnOut && !$btnOut.__b){ $btnOut.__b = true; $btnOut.type='button'; $btnOut.addEventListener('click', cerrarSesion, {capture:true}); }
}

// --------------------------------------------------
// Guard + carga de farmacia
// --------------------------------------------------
onAuthStateChanged(auth, async (user)=>{
  bindUI();

  if (!user){ location.href = ACCESS_URL; return; }

  try{
    await user.reload(); await user.getIdToken(true);

    const snap = await getDoc(doc(db, 'farmacias', user.uid));
    if (!snap.exists()){
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=sin_permiso';
      return;
    }

    const d = snap.data() || {};
    const estadoCuenta = String(d.estadoCuenta || '').toLowerCase();
    const suspendido = d.suspendido === true;

    if (suspendido || estadoCuenta === 'suspendido'){
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=suspendido';
      return;
    }
    if (estadoCuenta && estadoCuenta !== 'activo'){
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=pendiente';
      return;
    }

    setNombreFarmacia((d.nombreFarmacia || d.nombre || d.razonSocial || '').trim() || 'Farmacia');
  }catch(e){
    console.error('[FARM] guard:', e);
    setNombreFarmacia('—');
  }
});
