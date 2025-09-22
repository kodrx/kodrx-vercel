// Admin Médicos — SDK 12.2.1
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection, query, orderBy, limit, getDocs, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const UI = {
  q: document.getElementById("q"),
  grid: document.getElementById("grid"),
  btnReload: document.getElementById("btnReload"),
  btnSoloPend: document.getElementById("btnSoloPend"),
};
let soloPend = true;

function isAdminEmail(user){
  const email = (user?.email || "").toLowerCase();
  return email === "admin@kodrx.app"; // igual a tu regla isAdmin()
}

function card(m){
  const id = m.id, d = m.data() || {};
  const ver = d.verificado === true;
  const mailOK = d.correoVerificado === true;
  const estado = d.estadoCuenta || "activo";
  const pills = [
    `<span class="pill ${mailOK?'ok':'warn'}">${mailOK?'Correo verificado':'Correo no verificado'}</span>`,
    `<span class="pill ${ver?'ok':'warn'}">${ver?'Aprobado':'Pendiente admin'}</span>`,
    `<span class="pill ${estado==='activo'?'ok':'bad'}">${estado}</span>`
  ].join(" ");

  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    <div class="row"><strong>${d.nombre || "(Sin nombre)"} · ${d.cedula || "—"}</strong></div>
    <div class="muted">${d.especialidad || "General"}</div>
    <div class="muted">${d.correo || "—"} · ${d.telefono||"—"}</div>
    <div style="margin:8px 0">${pills}</div>
    <div class="row">
      <div>
        <button class="btn btn--pri" data-act="aprobar">Aprobar</button>
        <button class="btn" data-act="suspender">Suspender</button>
        <button class="btn" data-act="revertir">Revertir</button>
      </div>
      <small class="muted">${d.createdAt?.toDate? d.createdAt.toDate().toLocaleDateString('es-MX'):''}</small>
    </div>
  `;

  el.addEventListener("click", async (ev)=>{
    const act = ev.target?.dataset?.act;
    if (!act) return;
    const ref = doc(db,"medicos", id);

    try{
      if (act === "aprobar"){
        if (!mailOK && !confirm("El correo no aparece verificado. ¿Aprobar de todos modos?")) return;
        await updateDoc(ref, { verificado:true, estadoCuenta:"activo", verificadoPor: auth.currentUser.email||"", verificadoAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else if (act === "suspender"){
        await updateDoc(ref, { estadoCuenta:"suspendido", verificado:false, updatedAt: serverTimestamp() });
      } else if (act === "revertir"){
        await updateDoc(ref, { verificado:false, updatedAt: serverTimestamp() });
      }
      ev.target.closest(".card").style.opacity = .5;
    }catch(e){
      alert("No se pudo actualizar: " + (e?.message||e));
    }
  });

  return el;
}

async function load(){
  UI.grid.innerHTML = "Cargando…";
  // Para pocos docs: traemos 200 y filtramos cliente (simple y eficaz)
  const snap = await getDocs(query(collection(db,"medicos"), orderBy("createdAt","desc"), limit(200)));
  let docs = snap.docs;

  const qtxt = (UI.q.value||"").trim().toLowerCase();
  if (qtxt){
    docs = docs.filter(d=>{
      const x = JSON.stringify(d.data()||{}).toLowerCase();
      return x.includes(qtxt);
    });
  }
  if (soloPend){
    docs = docs.sort((a,b)=>{
      const av = (a.data()?.verificado===true) ? 1 : 0;
      const bv = (b.data()?.verificado===true) ? 1 : 0;
      return av - bv; // pendientes (0) primero
    });
  }

  UI.grid.innerHTML = "";
  docs.forEach(d => UI.grid.appendChild(card(d)));
  if (!docs.length) UI.grid.textContent = "Sin resultados.";
}

UI.btnReload.onclick = load;
UI.btnSoloPend.onclick = ()=>{ soloPend = !soloPend; UI.btnSoloPend.textContent = soloPend? "Pendientes primero":"Orden por fecha"; load(); };
UI.q.addEventListener("keydown", (e)=>{ if (e.key === "Enter") load(); });

onAuthStateChanged(auth, (user)=>{
  if (!user || !isAdminEmail(user)){ location.href = "/acceso?role=admin"; return; }
  load();
});
