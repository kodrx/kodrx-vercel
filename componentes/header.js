document.addEventListener("DOMContentLoaded", () => {
  const header = document.createElement("header");
  header.style.backgroundColor = "#002f6c";
  header.style.padding = "2rem 1rem";
  header.style.textAlign = "center";

  header.innerHTML = `
    <img src="/img/logo-kodrx.png" alt="KodRx" style="max-width: 180px; height: auto; margin-bottom: 0.5rem;" />
    <h1 style="font-size: 1.1rem; color: #cbd5e1; margin-top: 0.2rem; letter-spacing: 0.5px;">
      KodRx | Validación médica en blockchain
    </h1>
  `;

  document.body.prepend(header);
});
