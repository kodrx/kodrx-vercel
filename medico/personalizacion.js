// personalizacion.js

import { auth, db } from '/firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const form = document.getElementById("form-personalizacion");
const inputs = ["clinica", "direccion", "telefono", "pie"];

onAuthStateChanged(auth, async (user) => {
  if (!user) return (window.location.href = "/medico/login.html");

  const ref = doc(db, "medicos", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.personalizacion) {
    const p = data.personalizacion;
    inputs.forEach(id => {
      document.getElementById(id).value = p[id] || "";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const personalizacion = {};
    inputs.forEach(id => {
      personalizacion[id] = document.getElementById(id).value.trim();
    });

    try {
      await updateDoc(ref, { personalizacion });
      alert("Diseño personalizado guardado correctamente.");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  });
});
