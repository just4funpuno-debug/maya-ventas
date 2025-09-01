# MAYA Ventas – MVP (Vite + React + Tailwind)

## Requisitos

- Node 18+

## Instalación

```bash
npm install
npm run dev
# build
npm run build
npm run preview
```

### Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Las variables de Cloudinary (sin prefijo VITE\_) se usan solo en el middleware / funciones para generar la firma. Debes reiniciar `npm run dev` después de añadirlas.

## CSVs esperados

**Productos:** `sku, nombre, precio, costo, stock`  
**Ventas:** `fecha, sku, cantidad, precio, vendedora, metodo, cliente, notas`

## Demo logins

- admin@maya.com / admin123
- ana@maya.com / ana123
- luisa@maya.com / luisa123
