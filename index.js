import { auth, db } from './firebase-init.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

window.iniciarSesion = async () => {
  const correo = document.getElementById("correo").value;
  const password = document.getElementById("password").value;

  try {
    const cred = await signInWithEmailAndPassword(auth, correo, password);
    const uid = cred.user.uid;

    const refMedico = await getDoc(doc(db, "medicos", uid));
    const refFarmacia = await getDoc(doc(db, "farmacias", uid));

    if (refMedico.exists()) {
      const data = refMedico.data();
      if (data.verificado && !data.suspendido) {
        window.location.href = "/medico/panel.html";
      } else {
        alert("Tu cuenta de médico no está verificada o está suspendida.");
      }
    } else if (refFarmacia.exists()) {
      const data = refFarmacia.data();
      if (data.verificado && !data.suspendido) {
        window.location.href = "/farmacia/panel.html";
      } else {
        alert("Tu cuenta de farmacia no está verificada o está suspendida.");
      }
    } else {
      alert("No se encontró el usuario en la base de datos.");
    }
  } catch (err) {
    alert("Error al iniciar sesión: " + err.message);
  }
};
