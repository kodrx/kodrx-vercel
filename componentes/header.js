document.addEventListener("DOMContentLoaded", () => {
  const header = document.createElement("header");

  // Detecta si estás en index.html
  const esIndex = location.pathname.endsWith("/index.html") || location.pathname === "/";

  // Decide el logo según la página
  const logoSrc = esIndex ? "/img/logo-kodrx-blanco.png" : "/img/logo-kodrx-color.png";

  header.innerHTML = `
    <a href="/index.html" class="logo-link">
      <img src="${logoSrc}" class="logo" alt="KodRx Logo" />
    </a>
  `;

  document.body.insertBefore(header, document.body.firstChild);
});
