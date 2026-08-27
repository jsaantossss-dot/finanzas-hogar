# Finanzas de la casa

App para organizar los gastos, el presupuesto y las metas de ahorro/inversión del hogar. Los datos se guardan directamente en tu navegador (no salen de tu equipo ni se envían a ningún servidor).

## Probarla en tu computador

Necesitas tener instalado [Node.js](https://nodejs.org) (versión 18 o superior).

```bash
npm install
npm run dev
```

Abre la dirección que muestre la terminal (normalmente `http://localhost:5173`).

## Publicarla en internet (para instalarla en el celular)

La forma más simple es con **Vercel** o **Netlify**, ambos gratis para este uso:

1. Sube esta carpeta a un repositorio de GitHub (o usa el CLI de Vercel/Netlify directo desde tu PC).
2. En [vercel.com](https://vercel.com) o [netlify.com](https://netlify.com), crea un proyecto nuevo apuntando a ese repositorio.
3. Configura:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Despliega. Te darán una URL (por ejemplo `https://finanzas-hogar.vercel.app`).

### Instalarla como app

- **Celular (Android/iPhone):** abre esa URL en Chrome o Safari y elige "Agregar a pantalla de inicio" / "Instalar app".
- **PC (Chrome/Edge):** abre la URL y haz clic en el ícono de instalación que aparece en la barra de direcciones.

Desde ahí funciona como una app normal, con ícono propio y también sin conexión a internet.

## Estructura del proyecto

- `src/App.jsx` — toda la lógica y el diseño de la app.
- `public/manifest.json` — datos que hacen que el navegador la reconozca como app instalable.
- `public/service-worker.js` — permite que funcione sin internet una vez cargada.
- `public/icons/` — íconos de la app.

## Notas

- Los datos se guardan con `localStorage`, es decir, quedan en ese navegador/dispositivo específico. Si quieres tener los mismos datos en el celular y el PC a la vez, se necesitaría agregar una base de datos (por ejemplo Supabase o Firebase), lo cual es un paso adicional.
- Puedes editar las categorías de gasto directamente en `src/App.jsx`, en el arreglo `CATS`.
