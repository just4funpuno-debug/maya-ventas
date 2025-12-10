# 🚀 Desplegar Edge Function desde Dashboard (Sin CLI)

## 📋 Método: Dashboard de Supabase

**No necesitas CLI** - Todo desde el navegador.

---

## ✅ PASO 1: Preparar el Código

El código ya está creado en:
- `supabase/functions/meta-oauth-callback/index.ts`

**✅ Ya está listo para desplegar.**

---

## ✅ PASO 2: Desplegar desde Dashboard

### 2.1 Ir a Edge Functions

1. **Ve a:** https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **En el menú lateral:** Ve a **"Edge Functions"**
4. **O directamente:** https://supabase.com/dashboard/project/[TU-PROJECT-REF]/functions

### 2.2 Crear Nueva Función

1. **Haz clic en "Create a new function"** o **"Crear función"**
2. **Nombre de la función:** `meta-oauth-callback`
3. **Haz clic en "Create function"**

### 2.3 Copiar el Código

1. **Se abrirá un editor de código**
2. **Abre el archivo:** `supabase/functions/meta-oauth-callback/index.ts` en tu editor local
3. **Copia TODO el contenido**
4. **Pega en el editor del Dashboard**
5. **Haz clic en "Deploy"** o **"Desplegar"**

---

## ✅ PASO 3: Verificar Despliegue

1. **Deberías ver:** "Function deployed successfully"
2. **La función debería aparecer** en la lista de Edge Functions
3. **URL de la función:** `https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback`

---

## 🧪 PASO 4: Probar la Función

### Test Rápido desde el Dashboard:

1. **En la página de la función:** Busca **"Invoke"** o **"Invocar"**
2. **O usa curl desde terminal:**

```bash
curl https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**Resultado esperado:** Respuesta JSON

---

## ✅ Checklist

- [ ] Función creada en Dashboard
- [ ] Código copiado y pegado
- [ ] Función desplegada
- [ ] URL de función verificada
- [ ] Test básico ejecutado

---

## 🐛 Si Hay Problemas

### Error: "Function already exists"
- La función ya existe, edítala en lugar de crear nueva

### Error: "Invalid code"
- Verifica que copiaste TODO el código
- Verifica que no hay caracteres extra

### Error: "Deployment failed"
- Revisa los logs en el Dashboard
- Verifica la sintaxis del código

---

**¿Listo para desplegar? Sigue los pasos y avísame cuando esté desplegado para hacer el testing.**

