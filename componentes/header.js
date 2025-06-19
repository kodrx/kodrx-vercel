// /componentes/header.js
document.addEventListener("DOMContentLoaded", () => {
  const header = document.createElement("header");
  header.innerHTML = `
      <a href="/index.html" class="logo-link">
    <img src="/img/logo-kodrx.png" class="logo" alt="KodRx Logo" />
  </a>
    <h1>KodRx</h1>
  `;
  document.body.insertBefore(header, document.body.firstChild);
});
