// /farmacia/panelFarmacia.js (v3)
import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const ACCESS_URL = '/acceso?role=farmacia';
const $ = s => document.querySelector(s);

// --- UI refs ---
const video     = $('#cam');
const btnScan   = $('#btnScan');
const btnAbrir  = $('#btnAbrir');
const inputManual = $('#manual');

// file input invisible (lo creamos si no existe)
let fileInput = $('#fileQR');
if (!fileInput) {
  fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.capture = 'environment';
  fileInput.id = 'fileQR';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
}

function setNombreFarmacia(txt){
  const el = $('#nombre-farmacia');
  if (el) el.textContent = txt || 'Farmacia';
}

// ---------- Auth guard ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = ACCESS_URL; return; }

  try {
    await user.reload(); await user.getIdToken(true);
    const snap = await getDoc(doc(db, 'farmacias', user.uid));
    if (!snap.exists()) { await signOut(auth); location.href = '/acceso?role=farmacia&msg=sin_permiso'; return; }

    const d = snap.data() || {};
    const estado = String(d.estadoCuenta || '').toLowerCase();
    if (d.suspendido === true || (estado && estado !== 'activo')) {
      await signOut(auth);
      location.href = '/acceso?role=farmacia&msg=' + (d.suspendido ? 'suspendido' : 'pendiente');
      return;
    }
    const nombre = (d.nombreFarmacia || d.nombre || d.razonSocial || '').trim() || 'Farmacia';
    setNombreFarmacia(nombre);
  } catch (e) {
    console.error('[FARM] guard error:', e);
    setNombreFarmacia('—');
  }
});

// ---------- Navegación ----------
function extractId(txt) {
  try {
    const u = new URL(txt);
    // Acepta ?id=...  o  ?receta=...
    return u.searchParams.get('id') || u.searchParams.get('receta') || null;
  } catch {}
  // Como fallback, acepta IDs tipo Firestore
  return /^[A-Za-z0-9_-]{8,}$/.test(txt) ? txt : null;
}

function go(id) {
  if (!id) { alert('No se pudo leer el código'); return; }
  // Flujo farmacia → verificador
  location.href = `/farmacia/verificador.html?id=${encodeURIComponent(id)}`;
}

// ---------- Scanner ----------
let _rafId = 0;
let _stream = null;
let _mode = null; // 'bd' | 'jsqr'
let _fallbackTimer = 0;

function stopScan() {
  if (_rafId) cancelAnimationFrame(_rafId), _rafId = 0;
  if (_stream) {
    try { _stream.getTracks().forEach(t => t.stop()); } catch {}
    _stream = null;
  }
  if (_fallbackTimer) { clearTimeout(_fallbackTimer); _fallbackTimer = 0; }
  _mode = null;
  console.log('[SCAN] detenido');
}

async function ensureJsQR() {
  if (window.jsQR) return true;
  return new Promise((res) => {
    const s = document.createElement('script');
    s.src = '/vendor/jsqr.min.js'; // <-- asegúrate de servir con mime correcto
    s.async = true;
    s.onload = () => { console.log('[SCAN] jsQR cargado'); res(true); };
    s.onerror = () => { console.warn('[SCAN] jsQR no se pudo cargar'); res(false); };
    document.head.appendChild(s);
  });
}

async function startScan() {
  stopScan(); // idempotente

  // Pide cámara con gesto
  try {
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 }, height: { ideal: 720 }
      }
    };
    _stream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn('[SCAN] getUserMedia fail:', err);
    const name = String(err?.name || '');
    if (name.includes('NotAllowed')) {
      alert('No hay permiso para usar la cámara.\n\nRevisa el candado → Cámara → Permitir.');
    } else if (name.includes('NotFound')) {
      alert('No se encontró ninguna cámara. Usa “Abrir” con un ID o “Subir foto/QR”.');
    } else {
      alert('No se pudo abrir la cámara. Usa “Abrir” o “Subir foto/QR”.');
    }
    try { fileInput.click(); } catch {}
    return;
  }

  // Prepara el <video>
  video.srcObject = _stream;
  video.playsInline = true;
  video.muted = true;
  await video.play();
  console.log('[SCAN] cámara lista:', video.videoWidth, 'x', video.videoHeight);

  // Si hay BarcodeDetector, lo intentamos primero pero no eternamente:
  const hasBD = ('BarcodeDetector' in window);
  if (hasBD) {
    _mode = 'bd';
    runWithBarcodeDetector().catch(() => {});
    // Si en 10s no hubo detección, saltamos a jsQR
    _fallbackTimer = setTimeout(async () => {
      if (_mode === 'bd') {
        console.log('[SCAN] sin detección con BD, cambiando a jsQR…');
        await runWithJsQR();
      }
    }, 10000);
  } else {
    await runWithJsQR();
  }
}

async function runWithBarcodeDetector() {
  console.log('[SCAN] usando BarcodeDetector');
  const det = new window.BarcodeDetector({ formats: ['qr_code'] });

  const tick = async () => {
    try {
      if (!_stream) return;
      if (video.readyState >= 2) {
        // Muchos navegadores aceptan el <video> directo; otros requieren ImageBitmap
        let codes = null;
        try {
          codes = await det.detect(video);
        } catch {
          const bmp = await createImageBitmap(video);
          codes = await det.detect(bmp);
          bmp.close?.();
        }
        if (codes && codes.length) {
          const raw = codes[0].rawValue || '';
          const id = extractId(raw) || raw;
          console.log('[SCAN] QR detectado (BD):', raw, '→ id:', id);
          stopScan();
          return go(id);
        }
      }
    } catch (e) {
      console.warn('[SCAN] BD detect error, fallback a jsQR:', e);
      return runWithJsQR();
    }
    _rafId = requestAnimationFrame(tick);
  };

  _rafId = requestAnimationFrame(tick);
}

async function runWithJsQR() {
  console.log('[SCAN] usando jsQR (fallback)');
  _mode = 'jsqr';
  if (!(await ensureJsQR())) {
    alert('No se pudo cargar el lector offline (jsQR).');
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const tick = () => {
    try {
      if (!_stream) return;
      const w = video.videoWidth, h = video.videoHeight;
      if (w && h) {
        canvas.width = w; canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const res = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
        if (res?.data) {
          const id = extractId(res.data) || res.data;
          console.log('[SCAN] QR detectado (jsQR):', res.data, '→ id:', id);
          stopScan();
          return go(id);
        }
      }
    } catch {}
    _rafId = requestAnimationFrame(tick);
  };

  _rafId = requestAnimationFrame(tick);
}

// ---------- Fallback: subir foto ----------
fileInput.addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  if (!(await ensureJsQR())) { alert('No se pudo cargar jsQR'); return; }

  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, c.width, c.height);
    const res = window.jsQR(data.data, c.width, c.height, { inversionAttempts: 'dontInvert' });
    if (res?.data) {
      const id = extractId(res.data) || res.data;
      console.log('[SCAN] QR por imagen:', res.data, '→', id);
      go(id);
    } else {
      alert('No se pudo leer el QR de la imagen. Intenta con otra foto (bien enfocada y con buena luz).');
    }
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => { alert('No se pudo abrir la imagen seleccionada.'); };
  img.src = URL.createObjectURL(f);
});

// ---------- Botones ----------
btnScan?.addEventListener('click', startScan);
btnAbrir?.addEventListener('click', (e) => {
  e.preventDefault();
  const v = (inputManual.value || '').trim();
  if (!v) return;
  const id = extractId(v) || v;
  go(id);
});

// Exponer logout sólo si tu HTML lo usa inline
window.cerrarSesion = async () => {
  try { await signOut(auth); location.href = '/acceso?role=farmacia&msg=logout_ok'; }
  catch (err) { console.error('[FARM] logout error:', err); alert('No se pudo cerrar sesión.'); }
};

// Limpieza al salir de la página
window.addEventListener('beforeunload', stopScan);
