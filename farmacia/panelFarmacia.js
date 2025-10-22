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

// /farmacia/panelFarmacia.js
const v = document.getElementById('cam');
const btnScan = document.getElementById('btnScan');
const btnAbrir= document.getElementById('btnAbrir');
const manual  = document.getElementById('manual');

btnScan.addEventListener('click', startScan);
btnAbrir.addEventListener('click', ()=>{
  const val = (manual.value||'').trim();
  if (!val) return;
  const id = extractId(val);
  if (!id){ alert('No se reconoce ID/URL.'); return; }
  location.href = `/medico/ver-receta.html?id=${encodeURIComponent(id)}`;
});

function extractId(txt){
  try{
    const u = new URL(txt);
    // acepta .../verificar.html?id=XXXX o ...?id=XXXX
    return u.searchParams.get('id') || null;
  }catch{ /* no es URL */ }
  return txt.match(/^[A-Za-z0-9_-]{8,}$/) ? txt : null;
}

async function startScan(){
  // iOS necesita muted + playsinline, y user-gesture (hiciste click)
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }, audio: false
  });
  v.srcObject = stream; await v.play();

  if ('BarcodeDetector' in window){
    const det = new BarcodeDetector({ formats: ['qr_code'] });
    const loop = async ()=>{
      if (v.readyState >= 2){
        const bitmap = await createImageBitmap(v);
        try{
          const codes = await det.detect(bitmap);
          if (codes?.length){
            const raw = codes[0].rawValue || '';
            const id  = extractId(raw) || raw;
            stop(); go(id); return;
          }
        }catch{}
        bitmap.close?.();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }else{
    // Fallback ZXing
    const codeReader = new window.ZXing?.BrowserQRCodeReader();
    if (!codeReader){ alert('Tu navegador no soporta escáner. Usa la caja de texto.'); return; }
    const devices = await codeReader.getVideoInputDevices();
    const back = devices.find(d=>/back|rear|environment/i.test(d.label))?.deviceId || devices[0]?.deviceId;
    await codeReader.decodeFromVideoDevice(back, v, (res, err)=>{
      if (res?.text){
        stop(); go(extractId(res.text) || res.text);
      }
    });
  }

  function stop(){
    try{ v.srcObject?.getTracks?.().forEach(t=>t.stop()); }catch{}
    try{ cancelAnimationFrame(raf); }catch{}
  }
  function go(id){
    if (!id){ alert('No se pudo leer el código'); return; }
    location.href = `/medico/ver-receta.html?id=${encodeURIComponent(id)}`;
  }
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
