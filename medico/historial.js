
import { db, auth } from '/firebase-init.js';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';


const recetasContainer = document.getElementById('recetasContainer');
let recetas = [];

function getEmailSesion() {
  const email = localStorage.getItem('kodrx_email');
  if (!email) {
    console.warn("⚠️ No se encontró 'kodrx_email' en localStorage.");
  }
  return email;
}

async function validarSesionYcargar() {
  const email = getEmailSesion();

  if (!email) {
    alert("Sesión no válida o expirada. Vuelve a iniciar sesión.");
    window.location.href = "/acceso";
    return;
  }

  try {
    const q = query(
      collection(db, 'recetas'),
      where('correo', '==', email),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    console.log("🔍 Resultados encontrados:", querySnapshot.size);
querySnapshot.forEach((doc) => {
  console.log("📄 Documento:", doc.data());
});

    recetas = [];
    recetasContainer.innerHTML = '';

    const regresarBtn = document.createElement('button');
    regresarBtn.textContent = '⬅️ Regresar al panel';
    regresarBtn.onclick = () => {
      window.location.href = '/medico/panel.html';
    };
    recetasContainer.appendChild(regresarBtn);

    querySnapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      recetas.push(data);
    });

    mostrarRecetas(recetas);
  } catch (error) {
    console.error("❌ Error al cargar historial:", error);
    alert("Error al cargar el historial. Intenta nuevamente.");
  }
}

function mostrarRecetas(lista) {
  lista.forEach(receta => {
    const card = document.createElement('div');
    card.className = 'acordeon';

    const encabezado = document.createElement('div');
    encabezado.className = 'acordeon-header';
    encabezado.textContent = `${receta.pacienteNombre} — ${receta.fecha} ${receta.hora || ''}`;

    const contenido = document.createElement('div');
    contenido.className = 'acordeon-body';

    const botonVer = document.createElement('button');
    botonVer.textContent = 'Ver receta completa';
    botonVer.onclick = () => {
      window.location.href = `detalle-receta.html?id=${receta.id}`;
    };

    contenido.appendChild(botonVer);
    card.appendChild(encabezado);
    card.appendChild(contenido);
    recetasContainer.appendChild(card);

    encabezado.onclick = () => {
      contenido.classList.toggle('activo');
    };
  });
}

window.filtrarRecetas = (texto) => {
  const filtro = texto.toLowerCase();
  const filtradas = recetas.filter(r =>
    r.pacienteNombre.toLowerCase().includes(filtro)
  );
  mostrarRecetas(filtradas);
};

validarSesionYcargar();
