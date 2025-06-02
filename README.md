<p align="center">
  <img src="logo-kodrx.png" width="180" alt="KodRx Logo" />
</p>

<h1 align="center">KodRx</h1>

> KodRx es una plataforma digital de emisión y verificación de recetas médicas con autenticidad basada en la nube.  
> Diseñado para ser simple, seguro y accesible para médicos, farmacias y pacientes.

---

## 🚀 ¿Qué hace esta aplicación?

- Permite a médicos registrar recetas médicas desde un formulario web.
- Genera un **código QR** que contiene un enlace único a la receta.
- Las farmacias pueden escanear el QR y **verificar la receta online**.
- Toda la información se guarda en tiempo real usando **Firebase Realtime Database**.
- Visual con los colores y branding oficial de KodRx.

---

## 🛠 Tecnologías utilizadas

- 🔥 **Firebase** (Realtime Database)
- 🧠 **JavaScript Vanilla**
- 🌐 **HTML5 + CSS3**
- 📦 **Vercel** para hosting
- 📄 **GitHub** como repositorio de despliegue
- 📱 **QRServer API** para generar el código QR

---

## 📥 Cómo usar este repositorio

1. Clona este repositorio o descarga el ZIP.
2. Sube el contenido a tu propio hosting (recomendado: [Vercel](https://vercel.com)).
3. Abre `index.html` para emitir recetas médicas.
4. Escanea el QR generado para abrir `verificar.html?id=...` y ver los detalles de la receta.

> La receta se almacena en Firebase y se puede consultar desde cualquier dispositivo con conexión a Internet.

---

## 📸 Vista previa

### Formulario de emisión
![Formulario KodRx](https://via.placeholder.com/600x300?text=Formulario+de+receta+KodRx)

### Verificación vía QR
![Verificación KodRx](https://via.placeholder.com/600x300?text=Vista+de+receta+verificada)

---

## 📌 Personalización

Puedes editar:
- Los campos del formulario en `index.html`
- El diseño visual en las etiquetas `<style>`
- Conectar tu propio proyecto de Firebase modificando el bloque `firebaseConfig`

---

## 📄 Licencia

Este proyecto es de uso privado para el desarrollo inicial de la plataforma **KodRx**.  
Para cualquier consulta o propuesta, contactar al administrador del proyecto.

---

<p align="center">
  Hecho con 💚 por el equipo fundador de <strong>KodRx</strong>
</p>
