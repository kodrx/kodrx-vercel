// /farmacia/panelFarmacia.js
import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const $ = s => document.querySelector(s);
const ACCESS_URL = '/acceso?role=farmacia';

function setNombreFarmacia(txt){
  const el = $('#nombre-farmacia');
  if (el) el.textContent = txt || 'Farmacia';
}
async function cerrarSesion(){
  try{ await signOut(auth); location.href = '/acceso?role=farmacia&msg=logout_ok'; }
  catch(e){ alert('No se pudo cerrar sesión.'); }
}
['#btnLogout','#btnLogout2'].forEach(sel=>{
  const b=$(sel); if(b && !b.__b){ b.addEventListener('click', cerrarSesion, {capture:true}); b.__b=true; }
});

onAuthStateChanged(auth, async (user)=>{
  if(!user){ location.href = ACCESS_URL; return; }
  try{
    await user.reload(); await user.getIdToken(true);
    const snap = await getDoc(doc(db,'farmacias',user.uid));
    if(!snap.exists()){ await signOut(auth); location.href = ACCESS_URL+'&msg=sin_permiso'; return; }
    const d=snap.data()||{};
    const suspendido = d.suspendido===true || String(d.estadoCuenta||'').toLowerCase()==='suspendido';
    if(suspendido){ await signOut(auth); location.href = ACCESS_URL+'&msg=suspendido'; return; }
    if (d.estadoCuenta && String(d.estadoCuenta).toLowerCase()!=='activo'){
      await signOut(auth); location.href = ACCESS_URL+'&msg=pendiente'; return;
    }
    setNombreFarmacia((d.nombreFarmacia||d.nombre||d.razonSocial||'Farmacia').trim());
  }catch{ setNombreFarmacia('—'); }
});
