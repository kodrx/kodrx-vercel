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

btnLogout?.addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    console.log('[farmacia] cerrando sesión...');

    const { auth } = await import('/firebase-init.js');
    const { signOut } = await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js');

    sessionStorage.clear();
    localStorage.removeItem('kodrx.lastUser');

    await signOut(auth);

    window.location.replace('/acceso.html');
  } catch (err) {
    console.error('[farmacia logout error]', err);
    alert('No se pudo cerrar sesión');
  }
});

