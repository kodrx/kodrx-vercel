
document.addEventListener("DOMContentLoaded", () => {
  const header = document.createElement("header");

  // HTML temporal, sin logo aún
  header.innerHTML = `<a href="/index.html" class="logo-link"></a>`;
  document.body.insertBefore(header, document.body.firstChild);

  // Ahora que está en el DOM, podemos obtener su color de fondo
  const fondo = getComputedStyle(header).backgroundColor;

  // Si es azul oscuro (nuestro var --color-primario: #003366), usamos logo blanco
  const usaLogoBlanco = fondo.includes("0, 51, 102"); // RGB de #003366

  const logoSrc = usaLogoBlanco
    ? "/img/logo-kodrx-blanco.png"
    : "/img/logo-kodrx-color.png";

  header.querySelector(".logo-link").innerHTML = `
    <img src="${logoSrc}" class="logo" alt="KodRx Logo" />
  `;
});
