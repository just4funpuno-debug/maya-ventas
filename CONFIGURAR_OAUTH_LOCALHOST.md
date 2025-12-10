# 🚀 Configurar OAuth en Localhost

## ⚠️ Error Actual

```
Error: META_APP_ID no configurado en variables de entorno
```

Este error indica que falta la variable `VITE_META_APP_ID` en tu archivo `.env.local`.

---

## 📋 Pasos Rápidos

### 1. Crear/Editar `.env.local`

En la raíz del proyecto, crea o edita el archivo `.env.local`:

```bash
# Si no existe, créalo
touch .env.local
```

### 2. Agregar Variables de Entorno OAuth

Abre `.env.local` y agrega estas líneas:

```env
# Variables existentes (si ya las tienes)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Variables OAuth (NUEVAS - REQUERIDAS)
VITE_META_APP_ID=tu_meta_app_id_aqui
```

**Nota:** `VITE_META_OAUTH_REDIRECT_URI` es opcional, se construye automáticamente si no la proporcionas.

---

## 🔑 Obtener META_APP_ID

### Opción 1: Desde Meta Developer Console

1. Ve a [Meta Developer Console](https://developers.facebook.com/apps/)
2. Selecciona tu App
3. Ve a **Configuración** → **Básica**
4. Copia el **ID de la aplicación** (App ID)
5. Pégalo en `.env.local` como `VITE_META_APP_ID`

### Opción 2: Si ya lo tienes configurado en Supabase

Si ya configuraste `META_APP_ID` en Supabase Edge Functions, usa el mismo valor:

```env
VITE_META_APP_ID=el_mismo_valor_que_en_supabase
```

---

## ✅ Verificar Configuración

### 1. Verificar que el archivo existe

```bash
# En la raíz del proyecto
cat .env.local
```

Deberías ver:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_META_APP_ID=...
```

### 2. Reiniciar el servidor de desarrollo

**IMPORTANTE:** Vite solo carga variables de entorno al iniciar. Debes reiniciar:

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar
npm run dev
```

### 3. Verificar en la consola del navegador

Abre DevTools (F12) → Console y ejecuta:

```javascript
console.log('META_APP_ID:', import.meta.env.VITE_META_APP_ID);
console.log('SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
```

Deberías ver los valores (no `undefined`).

---

## 🔧 Ejemplo Completo de `.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary (si lo usas)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Meta OAuth (NUEVO)
VITE_META_APP_ID=1234567890123456
```

---

## ⚠️ Problemas Comunes

### El error persiste después de agregar la variable

1. **Verifica que el archivo se llama exactamente `.env.local`** (no `.env`, `.env.local.txt`, etc.)
2. **Reinicia el servidor de desarrollo** (Ctrl+C y `npm run dev`)
3. **Verifica que no hay espacios** alrededor del `=`:
   ```env
   # ✅ Correcto
   VITE_META_APP_ID=123456789
   
   # ❌ Incorrecto
   VITE_META_APP_ID = 123456789
   ```

### La variable no se carga en el navegador

- Las variables de entorno en Vite deben empezar con `VITE_`
- Solo están disponibles en el frontend si tienen el prefijo `VITE_`
- Reinicia el servidor después de cambiar `.env.local`

### No tengo META_APP_ID

Si aún no has creado la App en Meta Developer Console:

1. Ve a [Meta Developer Console](https://developers.facebook.com/apps/)
2. Crea una nueva App
3. Agrega el producto "WhatsApp"
4. Obtén el App ID desde Configuración → Básica

**Nota:** Para desarrollo local, puedes usar un App ID de prueba, pero para producción necesitarás uno real.

---

## 🎯 Checklist Rápido

- [ ] Archivo `.env.local` existe en la raíz del proyecto
- [ ] Variable `VITE_META_APP_ID` agregada
- [ ] Variable `VITE_SUPABASE_URL` agregada (si no estaba)
- [ ] Sin espacios alrededor del `=`
- [ ] Servidor de desarrollo reiniciado
- [ ] Verificado en consola del navegador

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir estos pasos el error persiste:

1. Verifica la consola del navegador (F12) para más detalles
2. Verifica que el archivo `.env.local` está en la raíz del proyecto
3. Verifica que reiniciaste el servidor de desarrollo
4. Consulta [TROUBLESHOOTING_OAUTH.md](./TROUBLESHOOTING_OAUTH.md)

---

**¡Listo!** Después de configurar esto, el botón "Conectar con Meta" debería funcionar en localhost. 🎉


