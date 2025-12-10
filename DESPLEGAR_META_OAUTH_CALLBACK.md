# 🚀 Desplegar Edge Function: meta-oauth-callback

## 📋 Método: Dashboard de Supabase (Sin CLI)

**Tiempo:** 5 minutos

---

## ✅ PASO 1: Ir a Edge Functions

1. **Abre:** https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **En el menú lateral:** Haz clic en **"Edge Functions"**
4. **O directamente:** https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions

---

## ✅ PASO 2: Crear Nueva Función

1. **Haz clic en "Create a new function"** o **"Crear función"**
2. **Nombre de la función:** `meta-oauth-callback`
   - ⚠️ **IMPORTANTE:** El nombre debe ser exactamente `meta-oauth-callback`
3. **Haz clic en "Create function"** o **"Crear función"**

---

## ✅ PASO 3: Copiar el Código

1. **Se abrirá un editor de código** en el Dashboard
2. **En tu editor local:** Abre `supabase/functions/meta-oauth-callback/index.ts`
3. **Selecciona TODO el contenido** (Ctrl+A)
4. **Copia** (Ctrl+C)
5. **Vuelve al Dashboard**
6. **Borra el código de ejemplo** que aparece
7. **Pega tu código** (Ctrl+V)
8. **Verifica que se vea completo**

---

## ✅ PASO 4: Desplegar

1. **Haz clic en "Deploy"** o **"Desplegar"** (botón en la parte superior)
2. **Espera a que termine** (verás "Deploying..." y luego "Deployed")
3. **Deberías ver:** "Function deployed successfully" ✅

---

## ✅ PASO 5: Verificar

1. **La función debería aparecer** en la lista de Edge Functions
2. **URL de la función:**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
3. **Haz clic en la función** para ver detalles

---

## 🧪 PASO 6: Probar (Opcional)

### Desde el Dashboard:
1. **En la página de la función:** Busca **"Invoke"** o **"Invocar"**
2. **Haz clic** para probar

### O desde terminal:
```bash
curl https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**Resultado esperado:**
```json
{
  "success": false,
  "error": "missing_code_or_state",
  "message": "Code o state faltante en la URL"
}
```

✅ **Esto es correcto** - Significa que la función está funcionando y validando correctamente.

---

## ✅ Checklist

- [ ] Función creada en Dashboard
- [ ] Código copiado desde `supabase/functions/meta-oauth-callback/index.ts`
- [ ] Código pegado en el editor del Dashboard
- [ ] Función desplegada exitosamente
- [ ] URL verificada
- [ ] Test básico ejecutado

---

## 🐛 Troubleshooting

### Error: "Function already exists"
- **Solución:** Edita la función existente en lugar de crear nueva
- Busca `meta-oauth-callback` en la lista y haz clic en "Edit"

### Error: "Invalid code" o "Syntax error"
- **Solución:** 
  - Verifica que copiaste TODO el código
  - Verifica que no hay caracteres extra
  - El editor del Dashboard te mostrará errores de sintaxis

### Error: "Deployment failed"
- **Solución:**
  - Revisa los logs en el Dashboard
  - Verifica la sintaxis del código
  - Asegúrate de que los imports estén correctos

---

## 📋 Código a Copiar

**Ubicación:** `supabase/functions/meta-oauth-callback/index.ts`

**Abre ese archivo y copia TODO su contenido (122 líneas).**

---

**¿Ya desplegaste la función? Avísame y hacemos el testing de SUBFASE 3.1.**

