# ✅ Solución: Apagar "Verify JWT with legacy secret"

## ❌ Problema Identificado

En la sección **"Function Configuration"** hay un toggle:
- **"Verify JWT with legacy secret"** → Está **ON** (activado/en verde)

**Esto causa:**
- Supabase requiere un JWT en el header `Authorization`
- Facebook NO envía ese header cuando redirige al callback
- Por eso falla con error 401

---

## ✅ Solución: Apagar el Toggle

1. **En la sección "Function Configuration":**
   - Encuentra el toggle **"Verify JWT with legacy secret"**
   - **Cambialo a OFF** (debe quedar en gris/apagado)

2. **Haz clic en "Save changes"** (botón al final de la sección)

3. **Espera** a que se guarde (puede tardar unos segundos)

---

## ✅ Por Qué Apagarlo

La descripción del toggle dice:
> "Recommendation: **OFF** with JWT and additional authorization logic implemented inside your function's code."

**Nuestra función ya tiene:**
- ✅ Validación de `state` (seguridad CSRF)
- ✅ Validación de `code` de OAuth
- ✅ Lógica de autorización interna

**No necesitamos** que Supabase valide el JWT porque:
- Los callbacks de OAuth desde Facebook no incluyen JWT
- Nuestra función tiene su propia validación

---

## 🔄 Después de Apagarlo

1. **Prueba el OAuth de nuevo** desde tu CRM
2. **Debería funcionar** sin error 401
3. **Revisa la pestaña "Invocations"** → Debería aparecer como 200 o 302 (success)

---

**¿Puedes apagar el toggle "Verify JWT with legacy secret" y hacer clic en "Save changes"?** 🚀


