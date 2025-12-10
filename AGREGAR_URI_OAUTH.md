# ✅ Agregar URI de Redireccionamiento OAuth

## 🎯 Estás en el Lugar Correcto

Veo que ya estás en la configuración de Facebook Login. Ahora necesitas agregar el URI en la sección **"URI de redireccionamiento de OAuth válidos"**.

---

## 📋 Pasos para Agregar el URI

### PASO 1: Desplázate Hacia Abajo

1. **Desplázate hacia abajo** en la página
2. **Busca la sección:** "URI de redireccionamiento de OAuth válidos"
   - Está después de la sección "Configuración del cliente de OAuth"
   - Puede estar parcialmente visible en la parte inferior

### PASO 2: Agregar el URI

1. **En la sección "URI de redireccionamiento de OAuth válidos":**
   - Verás un campo de texto o un botón "Agregar URI" / "Add URI"
   - Haz clic en el campo o en el botón

2. **Pega este URI exacto:**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```

3. **Haz clic en "Agregar"** o presiona Enter

### PASO 3: Verificar el URI

1. **Verifica que el URI aparezca en la lista:**
   - Debería verse algo como:
     ```
     ✓ https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
     ```

2. **Verifica que sea exactamente igual:**
   - ✅ Debe empezar con `https://`
   - ✅ No debe tener `https://` duplicado
   - ✅ No debe tener espacios
   - ✅ Debe terminar con `/meta-oauth-callback`

### PASO 4: Guardar Cambios

1. **Desplázate hasta el final de la página**
2. **Haz clic en el botón azul "Guardar cambios"** (Save changes)
3. **Espera a que se guarde** (verás un mensaje de confirmación)

---

## ✅ Verificación

Después de guardar, deberías ver:

```
URI de redireccionamiento de OAuth válidos:
  ✓ https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

---

## 🔍 Si No Ves la Sección

1. **Desplázate más hacia abajo** - Puede estar más abajo de lo que parece
2. **Busca un botón "Agregar URI"** o un campo de texto
3. **O busca "Add URI"** si está en inglés

---

## ⚠️ Nota sobre la Advertencia

Veo una advertencia sobre "Facebook Login for Business requiere acceso avanzado". 

**No es crítico para nuestro caso.** Podemos continuar sin eso por ahora. Si más adelante necesitas acceso avanzado, puedes solicitarlo.

---

## ✅ Checklist

- [ ] URI agregado en la lista
- [ ] URI es exactamente: `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`
- [ ] Cambios guardados (botón "Guardar cambios")

---

**¿Ya agregaste el URI y guardaste los cambios?** ✅

Avísame cuando esté listo y seguimos con el siguiente paso (agregar variables de entorno en Supabase).

