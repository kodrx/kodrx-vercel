// /farmacia/panelFarmacia.js
import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const ACCESS_URL = '/acceso?role=farmacia';
const $ = s => document.querySelector(s);
const video     = document.getElementById('cam');
const btnScan   = document.getElementById('btnScan');
const fileInput = document.getElementById('fileQR');
const btnPick   = document.getElementById('btnPick'); // botón “Subir foto/QR” en el HTML

function setNombreFarmacia(txt){
  const el = $('#nombre-farmacia');
  if (el) el.textContent = txt || 'Farmacia';
}

/* ─────────────────────────────
   SCAN: control de ciclo
────────────────────────────── */
let _rafId = 0;
let stopScanFn = null;

function stopScan(){
  try{ cancelAnimationFrame(_rafId); }catch{}
  _rafId = 0;
  try{
    const s = video.srcObject;
    if (s && s.getTracks) s.getTracks().forEach(t=>t.stop());
  }catch{}
  video.srcObject = null;
}
stopScanFn = stopScan;

// Cuando la pestaña se oculta, paramos
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) stopScan(); });

/* ─────────────────────────────
   SCAN: helpers
────────────────────────────── */
function extractId(txt){
  try{
    const u = new URL(txt);
    return u.searchParams.get('id') || null;
  }catch{}
  return /^[A-Za-z0-9_-]{8,}$/.test(txt) ? txt : null;
}

function go(id){
  if (!id){ alert('No se pudo leer el código'); return; }
  // Verificador para farmacia (si prefieres ver receta, cambia la URL):
  location.href = `/farmacia/verificador.html?id=${encodeURIComponent(id)}`;
  // location.href = `/medico/ver-receta.html?id=${encodeURIComponent(id)}`;
}

/* ─────────────────────────────
   SCAN: jsQR (fallback)
────────────────────────────── */
async function runWithJsQR(){
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const loop = () => {
    try{
      const w = video.videoWidth, h = video.videoHeight;
      if (w && h) {
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const res = window.jsQR && window.jsQR(img.data, w, h, { inversionAttempts:'dontInvert' });
        if (res?.data) {
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

/* ─────────────────────────────
   SCAN: BarcodeDetector (rápido)
────────────────────────────── */
async function runWithBarcodeDetector(){
  const det = new window.BarcodeDetector({ formats: ['qr_code'] });
  const loop = async () => {
    try{
      if (video.readyState >= 2) {
        const bmp = await createImageBitmap(video);
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
      // Si falla, caemos a jsQR
      if (window.jsQR) return runWithJsQR();
    }
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

/* ─────────────────────────────
   SCAN: pedido de cámara (gesto)
────────────────────────────── */
async function startScan(){
  try{
    // 1) Warm-up para disparar prompt (y habilitar enumerate labels)
    const warm = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
    warm.getTracks().forEach(t=>t.stop());

    // 2) Elegir cámara trasera (si existe)
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams = devs.filter(d=>d.kind==='videoinput');
    const back = cams.find(d => /back|rear|environment/i.test(d.label)) || cams[0];
    if (!back) throw new Error('NoCamera');

    // 3) Abrir stream seleccionado
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: back.deviceId } },
      audio: false
    });

    video.srcObject = stream;
    video.setAttribute('playsinline','true'); // iOS
    video.muted = true;
    await video.play();

    // 4) Detector
    if ('BarcodeDetector' in window) {
      await runWithBarcodeDetector();
    } else if (window.jsQR) {
      await runWithJsQR();
    } else {
      alert('No hay lector disponible. Usa “Subir foto/QR”.');
    }
  }catch(err){
    console.warn('[SCAN] getUserMedia fail:', err);
    const msg = String(err?.name || err?.message || '');

    if (/NotAllowed/i.test(msg) || /Permission/i.test(msg)) {
      alert('La cámara está bloqueada por el navegador o el sistema.\n\n• Pulsa el candado y permite “Cámara”\n• Revisa permisos del sistema\n• En iPhone: Ajustes > Safari > Cámara → Permitir');
    } else if (/NotFound|NoCamera/i.test(msg)) {
      alert('No se encontró cámara en este dispositivo.');
    } else {
      alert('No se pudo acceder a la cámara. Usa “Subir foto/QR”.');
    }

    // IMPORTANTE: NO llamar fileInput.click() aquí (no hay user activation)
    stopScan();
  }
}

/* ─────────────────────────────
   Fallback: leer foto del QR
────────────────────────────── */
async function onPickImage(e){
  const file = e.target.files?.[0];
  if (!file) return;
  if (!window.jsQR) { alert('No se pudo cargar el lector offline (jsQR).'); return; }

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const res = window.jsQR(data.data, canvas.width, canvas.height, { inversionAttempts:'dontInvert' });
    if (res?.data) {
      const id = extractId(res.data) || res.data;
      go(id);
    } else {
      alert('No se pudo leer el QR de la imagen. Asegúrate de que esté enfocado y con buena luz.');
    }
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => { alert('No se pudo abrir la imagen seleccionada.'); };
  img.src = URL.createObjectURL(file);
}

/* ─────────────────────────────
   Botones
────────────────────────────── */
btnScan?.addEventListener('click', startScan);
fileInput?.addEventListener('change', onPickImage);
btnPick?.addEventListener('click', () => fileInput?.click()); // gesto del usuario

/* ─────────────────────────────
   Guard + carga farmacia
────────────────────────────── */
onAuthStateChanged(auth, async (user) => {
  // Bind logout idempotente
  const btn = $('#btnLogout');
  if (btn && !btn.__bound){
    btn.type = 'button';
    btn.addEventListener('click', async ()=>{
      try{ stopScan(); await signOut(auth); }
      finally { location.href = '/acceso?role=farmacia&msg=logout_ok'; }
    }, {capture:true});
    btn.__bound = true;
  }

  if (!user) { location.href = ACCESS_URL; return; }

  try {
    await user.reload(); await user.getIdToken(true);
    const snap = await getDoc(doc(db, 'farmacias', user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=sin_permiso';
      return;
    }

    const d = snap.data() || {};
    const estadoCuenta = String(d.estadoCuenta || '').toLowerCase();
    const suspendido   = d.suspendido === true;

    if (suspendido || estadoCuenta === 'suspendido') {
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=suspendido';
      return;
    }
    if (estadoCuenta && estadoCuenta !== 'activo') {
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=pendiente';
      return;
    }

    const nombre = (d.nombreFarmacia || d.nombre || d.razonSocial || '').trim() || 'Farmacia';
    setNombreFarmacia(nombre);
  } catch (e) {
    console.error('[FARM] error guard:', e);
    setNombreFarmacia('—');
  }
});

