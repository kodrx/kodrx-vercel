
import { auth, db } from "/firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

console.log("[INICIO] adminLaboratorios-debug.js cargado correctamente");

try {
  onAuthStateChanged(auth, (user) => {
    if (user && user.email === "admin@kodrx.app") {
      console.log("[AUTH] Usuario autenticado como admin:", user.email);

      const iniciar = () => {
        console.log("[DOM] DOM listo. Iniciando cargarLaboratorios()");
        cargarLaboratorios();
        const form = document.getElementById("formLab");
        if (form) {
          console.log("[FORM] formLab encontrado");
          form.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("[FORM] Enviando nuevo laboratorio...");
          });
        } else {
          console.error("[FORM] formLab NO encontrado");
        }
      };

      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", iniciar);
      } else {
        iniciar();
      }

    } else {
      console.warn("[AUTH] Usuario no autorizado. Redirigiendo...");
      window.location.href = "/admin/login.html";
    }
  });
} catch (error) {
  console.error("[ERROR] en ejecución principal:", error);
}
