document.addEventListener("DOMContentLoaded", () => {
  const header = document.createElement("header");
  header.classList.add("site-header"); // ← ✅ Clase clave para ocultar en impresión

  // HTML inicial
  header.innerHTML = `<a href="/acceso.html" class="logo-link"></a>`;
  document.body.insertBefore(header, document.body.firstChild);

  // Obtener color de fondo
  const fondo = getComputedStyle(header).backgroundColor;
  const usaLogoBlanco = fondo.includes("0, 51, 102"); // RGB de #003366

  const logoSrc = usaLogoBlanco
    ? "/img/logo-kodrx-blanco.png"
    : "/img/logo-kodrx-color.png";

  header.querySelector(".logo-link").innerHTML = `
    <img src="${logoSrc}" class="logo" alt="KodRx Logo" />
  `;
});
