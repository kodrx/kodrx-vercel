
let medicamentosDisponibles = [];

// Cargar el archivo JSON con medicamentos
fetch('medicamentos_ext.json')
  .then(response => response.json())
  .then(data => {
    // Ordenar: primero destacados
    medicamentosDisponibles = data.sort((a, b) => {
      if (a.destacado === b.destacado) {
        return a.nombre.localeCompare(b.nombre);
      }
      return b.destacado - a.destacado;
    });
  });

// Función para iniciar autocompletado en un input
function iniciarAutocompletado(input) {
  const contenedorSugerencias = document.createElement("div");
  contenedorSugerencias.classList.add("sugerencias");
  input.parentNode.appendChild(contenedorSugerencias);

  input.addEventListener("input", () => {
    const valor = input.value.toLowerCase();
    contenedorSugerencias.innerHTML = "";

    if (!valor) return;

    const coincidencias = medicamentosDisponibles.filter(med =>
      med.nombre.toLowerCase().includes(valor)
    );

    if (coincidencias.length === 0) return;

    coincidencias.forEach(med => {
      const item = document.createElement("div");
      item.textContent = med.nombre;
      item.classList.add("sugerencia");
      item.onclick = () => {
        input.value = med.nombre;
        contenedorSugerencias.innerHTML = "";
      };
      contenedorSugerencias.appendChild(item);
    });
  });

  // Cerrar sugerencias si se hace clic fuera
  document.addEventListener("click", (e) => {
    if (!contenedorSugerencias.contains(e.target) && e.target !== input) {
      contenedorSugerencias.innerHTML = "";
    }
  });
}
