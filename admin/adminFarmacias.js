// /admin/adminFarmacias.js
import { auth, db } from "/firebase-init.js";
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = s => document.querySelector(s);

(async function start(){
  // asume que ya entraste como admin (tus reglas de admin via custom claims)
  await load();
})().catch(console.error);

async function load(){
  // Pendientes
  const qPend = query(
    collection(db, "farmacias"),
    where("estadoCuenta", "in", ["pendiente","suspendido"]),
    orderBy("fechaRegistro","desc"),
    limit(50)
  );
  const p = await getDocs(qPend);
  $("#pendientes").innerHTML = renderList(p.docs, { showActions:true });

  // Activas
  const qAct = query(
    collection(db, "farmacias"),
    where("estadoCuenta","==","activo"),
    orderBy("fechaRegistro","desc"),
    limit(50)
  );
  const a = await getDocs(qAct);
  $("#activas").innerHTML = renderList(a.docs, { showActions:true });
}

function renderList(docs, { showActions }={}){
  if (!docs.length) return `<p>Sin registros.</p>`;
  return docs.map(d=>{
    const x = { id:d.id, ...(d.data()||{}) };
    return `
      <div class="card" style="padding:10px;margin:8px 0;border:1px solid #e5e7eb;border-radius:10px">
        <div><b>${x.nombre || x.nombreFarmacia || 'Farmacia'}</b> · ${x.correo||''}</div>
        <div style="font-size:12px;color:#6b7280">
          Estado: <b>${x.estadoCuenta||'—'}</b> · Verificado: <b>${x.verificado===false?'no':'sí'}</b>
        </div>
        ${showActions ? `
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <button data-act="activar" data-id="${x.id}">Activar</button>
            <button data-act="suspender" data-id="${x.id}">Suspender</button>
            <button data-act="verificar" data-id="${x.id}">Marcar verificada</button>
          </div>
        `:''}
      </div>`;
  }).join('');
}

document.addEventListener("click", async (e)=>{
  const b = e.target.closest("button[data-act]");
  if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;

  const ref = doc(db, "farmacias", id);
  if (act === "activar"){
    await updateDoc(ref, { estadoCuenta:"activo", verificado:true, fechaActivacion: serverTimestamp() });
  }else if (act === "suspender"){
    await updateDoc(ref, { estadoCuenta:"suspendido", suspendido:true });
  }else if (act === "verificar"){
    await updateDoc(ref, { verificado:true });
  }
  await load();
});
