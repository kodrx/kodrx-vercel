// /farmacia/panelFarmacia.js
import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const ACCESS_URL = '/acceso?role=farmacia';
const $ = s => document.querySelector(s);

function setNombreFarmacia(txt){
  const el = $('#nombre-farmacia');
  if (el) el.textContent = txt || 'Farmacia';
}


// Checar permiso antes de pedir cámara
async function camPermissionState(){
  if (!navigator.permissions) return 'unknown';
  try{
    const s = await navigator.permissions.query({ name: 'camera' });
    return s.state; // 'granted' | 'denied' | 'prompt'
  }catch{ return 'unknown'; }
}

btnScan.addEventListener('click', async () => {
  const st = await camPermissionState();
  // Opcional: mostrar hint si viene 'denied' antes de intentar
  if (st === 'denied'){
    alert('La cámara está bloqueada. Habilítala en el candado de la barra de direcciones y vuelve a intentar.');
  }
  // Aquí sí getUserMedia, inmediatamente tras el clic
  await startScan();
});

// --- Scanner QR con BarcodeDetector + fallback jsQR ---
const video     = document.getElementById('cam');
const btnScan   = document.getElementById('btnScan');
const fileInput = document.getElementById('fileQR');

btnScan?.addEventListener('click', startScan);
fileInput?.addEventListener('change', onPickImage);

async function startScan(){
  try{
    // 1) pedir permiso con gesto de usuario
    const constraints = { video: { facingMode: { ideal: 'environment' } }, audio: false };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.setAttribute('playsinline', 'true'); // iOS
    video.muted = true;
    await video.play();

    // 2) detector
    if ('BarcodeDetector' in window) {
      await runWithBarcodeDetector();  // tu función
    } else if (window.jsQR) {
      await runWithJsQR();             // tu función
    } else {
      throw new Error('No hay BarcodeDetector ni jsQR');
    }
  }catch(err){
    console.warn('[SCAN] getUserMedia fail:', err);

    // Mensaje didáctico según tipo de error
    const msg = String(err?.name || err?.message || '');
    if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
      alert(
        'No hay permiso para usar la cámara.\n\n' +
        '• Revisa el candado de la barra (Permisos → Cámara → Permitir)\n' +
        '• En tu sistema habilita el permiso de cámara para el navegador\n' +
        '• En iPhone: Ajustes > Safari > Cámara → Permitir'
      );
    } else if (msg.includes('NotFoundError')) {
      alert('No se encontró ninguna cámara en este dispositivo.');
    } else {
      alert('No se pudo acceder a la cámara. Usa el botón “Subir foto/QR”.');
    }

    // Fallback inmediato: abrir selector de imagen (usa cámara nativa en móviles)
    try { fileInput?.click(); } catch {}
  }
}

// Fallback: leer una imagen (foto del QR) con jsQR
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
      go(id);  // tu función de navegación
    } else {
      alert('No se pudo leer el QR de la imagen. Intenta con otra foto (que esté bien enfocada y con buena luz).');
    }
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => { alert('No se pudo abrir la imagen seleccionada.'); };
  img.src = URL.createObjectURL(file);
}

function extractId(txt){
  try{
    const u = new URL(txt);
    return u.searchParams.get('id') || null;
  }catch{}
  return /^[A-Za-z0-9_-]{8,}$/.test(txt) ? txt : null;
}
let stopScanFn = null;



async function runWithBarcodeDetector(){
  const det = new window.BarcodeDetector({ formats: ['qr_code'] });
  const loop = async () => {
    try {
      if (video.readyState >= 2) {
        const bmp = await createImageBitmap(video);
        const codes = await det.detect(bmp);
        bmp.close?.();
        if (codes && codes.length) {
          const raw = codes[0].rawValue || '';
          const id = extractId(raw) || raw;
          if (stopScanFn) stopScanFn();
          return go(id);
        }
      }
    } catch (e) {
      // Si falla (algunos Android viejos), caemos a jsQR si está disponible
      if (window.jsQR) {
        return runWithJsQR();
      }
    }
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

async function runWithJsQR(){
  // Canvas temporal para leer el frame
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const loop = () => {
    try{
      const w = video.videoWidth, h = video.videoHeight;
      if (w && h) {
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const res = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (res?.data) {
          const id = extractId(res.data) || res.data;
          if (stopScanFn) stopScanFn();
          return go(id);
        }
      }
    }catch(e){ /* ignora, seguimos */ }
    _rafId = requestAnimationFrame(loop);
  };
  _rafId = requestAnimationFrame(loop);
}

function go(id){
  if (!id){ alert('No se pudo leer el código'); return; }
  // Si farmacia debe abrir verificador:
  // location.href = `/farmacia/verificador.html?id=${encodeURIComponent(id)}`;
  // Si deben ver la receta del médico:
  location.href = `/medico/ver-receta.html?id=${encodeURIComponent(id)}`;
}


async function cerrarSesion(){
  try {
    await signOut(auth);
    location.href = '/acceso?role=farmacia&msg=logout_ok';
  } catch (err) {
    console.error('[FARM] logout error:', err);
    alert('Hubo un problema al cerrar sesión, intenta de nuevo.');
  }
}

// Bind del botón (idempotente)
function bindUI(){
  const btn = $('#btnLogout');
  if (btn && !btn.__bound){
    btn.type = 'button';
    btn.addEventListener('click', cerrarSesion, { capture:true });
    btn.__bound = true;
  }
}

// Guard + carga
onAuthStateChanged(auth, async (user) => {
  bindUI();

  if (!user) {
    location.href = ACCESS_URL;
    return;
  }

  try {
    await user.reload(); await user.getIdToken(true);

    const snap = await getDoc(doc(db, 'farmacias', user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=sin_permiso';
      return;
    }

    const d = snap.data() || {};
    // Normaliza campos
    const estadoCuenta = String(d.estadoCuenta || '').toLowerCase();
    const suspendido   = d.suspendido === true;
    const verificado   = d.verificado !== false;

    // Bloqueos
    if (suspendido || estadoCuenta === 'suspendido') {
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=suspendido';
      return;
    }
    if (estadoCuenta && estadoCuenta !== 'activo') {
      // pendiente u otro estado
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=pendiente';
      return;
    }

    // Pintar nombre
    const nombre =
      (d.nombre || d.nombreFarmacia || d.razonSocial || '').trim() || 'Farmacia';
    setNombreFarmacia(nombre);

  } catch (e) {
    console.error('[FARM] error guard:', e);
    setNombreFarmacia('—');
  }
});

// (Opcional) expón cerrarSesion solo si aún tienes algún onclick viejo en plantillas
// window.cerrarSesion = cerrarSesion;
