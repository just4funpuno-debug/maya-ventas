# ⚡ Solución Rápida: OAuth en Localhost

## 🔴 Error Actual

```
Error: META_APP_ID no configurado en variables de entorno
```

## ✅ Solución en 3 Pasos

### Paso 1: Abrir `.env.local`

Abre el archivo `.env.local` en la raíz del proyecto.

### Paso 2: Agregar esta línea

Agrega al final del archivo:

```env
VITE_META_APP_ID=tu_app_id_aqui
```

**Reemplaza `tu_app_id_aqui` con tu App ID de Meta Developer Console.**

### Paso 3: Reiniciar el servidor

```bash
# Detener el servidor (Ctrl+C en la terminal donde corre npm run dev)
# Luego reiniciar:
npm run dev
```

---

## 🔑 ¿Dónde obtener META_APP_ID?

1. Ve a: https://developers.facebook.com/apps/
2. Selecciona tu App
3. Ve a **Configuración** → **Básica**
4. Copia el **ID de la aplicación**
5. Pégalo en `.env.local`

**Ejemplo:**
```env
VITE_META_APP_ID=1234567890123456
```

---

## ✅ Verificar que Funciona

1. Reinicia el servidor (`npm run dev`)
2. Refresca el navegador (F5)
3. Ve a **Administración** → **WhatsApp** → **Agregar Cuenta**
4. Haz clic en **"Conectar con Meta"**
5. Debería abrirse la ventana OAuth de Meta ✅

---

## ⚠️ Si el error persiste

1. **Verifica el nombre exacto:** `VITE_META_APP_ID` (con `VITE_` al inicio)
2. **Verifica que no hay espacios:** `VITE_META_APP_ID=valor` (sin espacios)
3. **Reinicia el servidor** (Vite solo carga variables al iniciar)
4. **Verifica en consola del navegador (F12):**
   ```javascript
   console.log(import.meta.env.VITE_META_APP_ID);
   ```
   Debería mostrar tu App ID (no `undefined`)

---

**¡Listo!** Después de esto, OAuth debería funcionar en localhost. 🎉


