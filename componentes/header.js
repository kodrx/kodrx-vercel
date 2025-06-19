document.addEventListener("DOMContentLoaded", () => {
  const usaLogoClaro = !window.location.pathname.includes("/index.html");

  const header = document.createElement("header");
  header.innerHTML = `
    <a href="/index.html" class="logo-link">
      <img src="/img/${usaLogoClaro ? 'logo-kodrx-blanco.png' : 'logo-kodrx-color.png'}" class="logo" alt="KodRx Logo" />
    </a>
  `;
  document.body.insertBefore(header, document.body.firstChild);
});
