// panel.js
import { auth, db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
});

window.cerrarSesion = () => {
  signOut(auth).then(() => window.location.href = "login.html");
};

window.mostrarFormulario = () => {
  document.getElementById('form-receta').style.display = 'block';
  document.getElementById('resultado').style.display = 'none';
};

window.nuevaReceta = () => {
  document.getElementById('form-receta').reset();
  document.getElementById('medicamentos').innerHTML = '';
  agregarMedicamento();
  mostrarFormulario();
};

window.agregarMedicamento = () => {
  const div = document.createElement('div');
  div.className = 'medicamento';
  div.innerHTML = `
    <input type="text" placeholder="Nombre del medicamento" required><br>
    <input type="text" placeholder="Dosis" required><br>
    <input type="text" placeholder="Duración" required>
  `;
  document.getElementById('medicamentos').appendChild(div);
};

document.getElementById('form-receta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  const form = e.target;
  const nombre = form.querySelector('input[placeholder="Nombre del paciente"]').value;
  const edad = form.querySelector('input[placeholder="Edad"]').value;
  const observaciones = form.querySelector('textarea').value;

  const medsDiv = document.querySelectorAll('.medicamento');
  const medicamentos = Array.from(medsDiv).map(div => {
    const inputs = div.querySelectorAll('input');
    return {
      nombre: inputs[0].value,
      dosis: inputs[1].value,
      duracion: inputs[2].value
    };
  });

  try {
    const docRef = await addDoc(collection(db, "recetas"), {
      medico: user.uid,
      nombrePaciente: nombre,
      edad,
      observaciones,
      medicamentos,
      timestamp: serverTimestamp()
    });

    const recetaId = docRef.id;
    const qrDiv = document.getElementById('qr');
    qrDiv.innerHTML = "";
    new QRCode(qrDiv, `${window.location.origin}/verificar.html?id=${recetaId}`);

    document.getElementById('form-receta').style.display = 'none';
    document.getElementById('resultado').style.display = 'block';
  } catch (err) {
    alert("Error al guardar la receta: " + err.message);
  }
});
