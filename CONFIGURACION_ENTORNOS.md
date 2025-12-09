# 📋 Configuración de Entornos - Dónde Obtener la Información

## 🎯 Resumen

Este proyecto usa un sistema híbrido:
- **Localhost (Desarrollo)**: Supabase Auth + Supabase Datos
- **Vercel (Producción)**: Firebase Auth + Firebase Datos

## 🔧 Localhost - Supabase

### Dónde obtener la información:

1. **VITE_SUPABASE_URL**
   - Ve a: https://app.supabase.com
   - Selecciona tu proyecto
   - Ve a: Settings → API
   - Copia el valor de "Project URL"
   - Ejemplo: `https://xxxxxxxxxxxxx.supabase.co`

2. **VITE_SUPABASE_ANON_KEY**
   - En la misma página (Settings → API)
   - Copia el valor de "anon public" key
   - Es la clave que empieza con `eyJ...`

### Dónde configurarlo:
- Archivo: `.env.local` (en la raíz del proyecto)
- Formato:
  ```
  VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

## ☁️ Vercel - Firebase

### Dónde obtener la información:

1. **Firebase Config**
   - Ve a: https://console.firebase.google.com
   - Selecciona tu proyecto
   - Ve a: Project Settings (⚙️) → General
   - Baja hasta "Your apps" → Web app (</>) o crea una nueva
   - Copia el objeto `firebaseConfig`
   - Se ve así:
     ```javascript
     const firebaseConfig = {
       apiKey: "AIza...",
       authDomain: "tu-proyecto.firebaseapp.com",
       projectId: "tu-proyecto",
       storageBucket: "tu-proyecto.appspot.com",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abcdef"
     };
     ```

2. **Dónde está configurado en el código:**
   - Archivo: `_deprecated/firebase.js`
   - Actualmente tiene valores hardcodeados
   - Estos valores son los que usa Vercel en producción

### Configuración actual en `_deprecated/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCF-q5TvekwqvO4s1SavFlX4zpO5q_FIZY",
  authDomain: "maya-ventas.firebaseapp.com",
  projectId: "maya-ventas",
  storageBucket: "maya-ventas.firebasestorage.app",
  messagingSenderId: "696160231725",
  appId: "1:696160231725:web:279d5b1a375a710ecd33a4"
};
```

### Para actualizar Firebase en producción:
1. Ve a Firebase Console
2. Obtén los nuevos valores de `firebaseConfig`
3. Actualiza `_deprecated/firebase.js` con los nuevos valores
4. Haz commit y push
5. Vercel desplegará automáticamente

## 📝 Variables de Entorno en Vercel

### ¿Necesitas agregar variables en Vercel?
**NO** para Firebase (ya está hardcodeado en el código)
**SÍ** solo si quieres usar Supabase también en producción

### Si quieres usar Supabase en Vercel:

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: "maya-ventas"
3. Ve a: Settings → Environment Variables
4. Agrega:
   - `VITE_SUPABASE_URL` = (obtener de Supabase Dashboard)
   - `VITE_SUPABASE_ANON_KEY` = (obtener de Supabase Dashboard)

**Nota**: Si NO agregas estas variables, Vercel usará Firebase automáticamente.

## 🔄 Flujo de Trabajo Actual

1. **Desarrollo (Localhost)**
   - Usa Supabase (configurado en `.env.local`)
   - Trabajas normalmente con Supabase

2. **Producción (Vercel)**
   - Usa Firebase automáticamente
   - Los datos están en Firebase
   - Los usuarios autenticados están en Firebase Auth

## ⚠️ Importante

- **Seguimos trabajando con Supabase** en desarrollo
- Vercel usa Firebase porque así está configurado actualmente
- Los datos de producción están en Firebase
- Los datos de desarrollo están en Supabase

## 📍 Ubicaciones Clave

### Archivos de Configuración:
- `.env.local` → Variables para localhost (Supabase)
- `_deprecated/firebase.js` → Configuración de Firebase para producción
- `src/utils/authProvider.js` → Detecta el entorno y usa el proveedor correcto
- `src/supabaseUsers.js` → Detecta el entorno y usa Supabase o Firebase

### Dashboards:
- **Supabase**: https://app.supabase.com
- **Firebase**: https://console.firebase.google.com
- **Vercel**: https://vercel.com/dashboard

---

**Última actualización**: 2025-01-27
**Estado**: Sistema híbrido funcionando - Supabase en dev, Firebase en prod

