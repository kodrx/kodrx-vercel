// /admin/adminLaboratorios.js (SDK 12 modular)
import { auth, db } from '/firebase-init.js';
import {
  onAuthStateChanged, sendPasswordResetEmail, signOut
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import {
  collection, addDoc, serverTimestamp, getDocs, query, orderBy,
  updateDoc, doc
} from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $ = (s) => document.querySelector(s);
const elNombre = $('#inpNombre');
const elContacto = $('#inpContacto');
const elCorreo = $('#inpCorreo');
const elTel = $('#inpTelefono');
const elUbic = $('#inpUbicacion');
const elBtnCrear = $('#btnCrear');
const elMsgCrear = $('#msgCrear');
const elList = $('#labs');

function isAdminUser(user) {
  // opción rápida por email mientras llegan los claims
  if (!user) return false;
  if (user.email === 'admin@kodrx.app') return true;
  // si ya tienes custom claims, puedes leerlas desde el IdTokenResult:
  // (no bloqueamos aquí por async; el guard abajo refuerza)
  return false;
}

async function guardAdmin(user){
  if (!user) { location.href = '/acceso?role=admin'; return false; }
  try {
    const token = await user.getIdTokenResult(true);
    const ok = token.claims?.admin === true || user.email === 'admin@kodrx.app';
    if (!ok) { await signOut(auth); location.href = '/acceso?role=admin&msg=sin_permiso'; return false; }
    return true;
  } catch {
    await signOut(auth); location.href = '/acceso?role=admin'; return false;
  }
}

function pillEstado({ suspendido, verificado, estadoCuenta }) {
  if (suspendido) return `<span class="pill warn">Suspendido</span>`;
  if (verificado === true) return `<span class="pill ok">Verificado</span>`;
  const est = (estadoCuenta||'pendiente').toLowerCase();
  if (est === 'activo') return `<span class="pill ok">Activo</span>`;
  return `<span class="pill">Pendiente</span>`;
}

async function loadList(){
  elList.textContent = 'Cargando…';
  try{
    const q = query(collection(db, 'laboratorios'), orderBy('createdAt','desc'));
    const snap = await getDocs(q);
    if (snap.empty){ elList.textContent = 'Sin registros aún.'; return; }

    const frags = [];
    snap.forEach(d => {
      const x = { id: d.id, ...d.data() };
      frags.push(`
        <div class="lab" data-id="${x.id}">
          <div>
            <h4>${x.nombre || '—'}</h4>
            <div class="muted">${x.contacto || '—'} · ${x.correo || '—'} · ${x.telefono || '—'}</div>
            <div class="muted">${x.ubicacion || ''}</div>
          </div>
          <div class="actions">
            ${pillEstado(x)}
            <button class="btn" data-act="toggle-ver">${x.verificado ? 'Quitar verificación':'Verificar'}</button>
            <button class="btn" data-act="toggle-sus">${x.suspendido ? 'Reactivar':'Suspender'}</button>
            ${x.correo ? `<button class="btn" data-act="reset">Reset contraseña</button>` : ''}
          </div>
        </div>
      `);
    });
    elList.innerHTML = frags.join('');

    // bind actions
    elList.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const card = e.currentTarget.closest('.lab');
        const id = card?.dataset.id;
        const act = e.currentTarget.dataset.act;
        if (!id) return;

        try{
          const ref = doc(db, 'laboratorios', id);
          if (act === 'toggle-ver') {
            const nowBtnTxt = e.currentTarget.textContent;
            const to = nowBtnTxt.includes('Quitar') ? false : true;
            await updateDoc(ref, { verificado: to, estadoCuenta: to ? 'activo' : 'pendiente' });
          } else if (act === 'toggle-sus') {
            const nowBtnTxt = e.currentTarget.textContent;
            const to = nowBtnTxt === 'Suspender';
            await updateDoc(ref, { suspendido: to });
          } else if (act === 'reset') {
            const email = card.querySelector('.muted')?.textContent?.split('·')[1]?.trim();
            const correo = email || prompt('Correo del laboratorio para enviar el reset:');
            if (correo) { await sendPasswordResetEmail(auth, correo); alert('Email de restablecimiento enviado.'); }
          }
          await loadList();
        }catch(err){
          console.error('[LAB/act]', err);
          alert('No se pudo aplicar la acción.');
        }
      });
    });

  }catch(err){
    console.error('Error al cargar laboratorios:', err);
    elList.textContent = 'Error al cargar laboratorios.';
  }
}

async function onCreate(){
  elMsgCrear.textContent = '';
  const nombre   = elNombre.value.trim();
  const contacto = elContacto.value.trim();
  const correo   = elCorreo.value.trim();
  const telefono = elTel.value.trim();
  const ubic     = elUbic.value.trim();
  if (!nombre){ elMsgCrear.textContent = 'Falta nombre.'; return; }

  try{
    await addDoc(collection(db, 'laboratorios'), {
      nombre, contacto, correo, telefono, ubicacion: ubic,
      createdAt: serverTimestamp(),
      // estado inicial
      verificado: false,
      suspendido: false,
      estadoCuenta: 'pendiente'
    });
    elNombre.value = elContacto.value = elCorreo.value = elTel.value = elUbic.value = '';
    elMsgCrear.textContent = 'Laboratorio registrado.';
    await loadList();
  }catch(err){
    console.error('[LAB/create]', err);
    elMsgCrear.textContent = 'No se pudo registrar.';
  }
}

elBtnCrear?.addEventListener('click', onCreate, { capture:true });

// Guard + boot
onAuthStateChanged(auth, async (user) => {
  const ok = await guardAdmin(user);
  if (!ok) return;
  loadList();
});
