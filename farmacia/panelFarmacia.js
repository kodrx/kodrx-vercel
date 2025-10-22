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
