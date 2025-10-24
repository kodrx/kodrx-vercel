// Botones del panel
const btnEscanear = document.getElementById('btnEscanear');
const btnHist     = document.getElementById('btnHistorial');
const btnLogout   = document.getElementById('btnLogout');

btnEscanear?.addEventListener('click', (e)=>{
  e.preventDefault();
  location.href = '/farmacia/verificador.html';   // ← abre lector
});

btnHist?.addEventListener('click', (e)=>{
  e.preventDefault();
  location.href = '/farmacia/historial.html';
});

// btnLogout ya lo tienes enlazado a cerrarSesion()

