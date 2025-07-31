document.addEventListener("DOMContentLoaded", () => {
  const header = document.createElement("header");
  header.classList.add("site-header");

  header.innerHTML = `
    <div class="logo-container">
      <img src="/img/logo-kodrx-blanco.png" alt="KodRx Logo" class="logo-img" />
      <span class="tagline">Validación médica en blockchain</span>
    </div>
  `;

  document.body.insertBefore(header, document.body.firstChild);
});
