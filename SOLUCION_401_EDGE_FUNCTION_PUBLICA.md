# 🔧 Solución: Hacer Edge Function Pública

## ❌ Problema

El error 401 ocurre porque **Supabase requiere autenticación** para acceder a Edge Functions, pero los callbacks de OAuth desde Facebook **no envían headers de autenticación**.

---

## ✅ Solución: Usar Anon Key en la URL

Para hacer la función accesible públicamente, puedes usar el **anon key** de Supabase en la URL del callback.

### **PASO 1: Obtener Anon Key**

1. **Ve a:** Supabase Dashboard → Settings → API
2. **Copia el "anon public" key**

---

### **PASO 2: Actualizar URL del Callback en Facebook**

1. **Ve a:** Facebook Developer Console → Tu App → Productos → Facebook Login → Configuración
2. **En "URI de redireccionamiento de OAuth válidos"**, agrega:
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?anon_key=TU_ANON_KEY
   ```
   **Pero espera...** esto no es correcto porque Facebook redirige con `?code=...&state=...` y agregar `anon_key` en la URL del callback podría causar conflictos.

---

## ✅ SOLUCIÓN CORRECTA: Modificar el Código para Manejar Auth

En realidad, la mejor solución es hacer que la función acepte el `anon_key` como query parameter y lo use para autenticarse internamente, O verificar si Supabase tiene una opción para hacer funciones públicas.

---

## 🔍 Verificar Configuración en Supabase Dashboard

1. **Ve a:** Supabase Dashboard → Edge Functions → `meta-oauth-callback` → **"Details"** o **"Settings"**
2. **Busca:** Alguna opción como:
   - "Public Access"
   - "Allow unauthenticated requests"
   - "Anonymous Access"
   - "Security Settings"

3. **Si encuentras esa opción**, actívala

---

## 💡 Alternativa: Usar Anon Key como Header

Otra opción es modificar el código para que detecte cuando NO hay header de autorización y use el anon key automáticamente para operaciones que no requieren autenticación específica del usuario.

Pero esto no soluciona el problema porque Supabase está rechazando el request ANTES de que llegue al código.

---

## 🚀 Próximos Pasos

1. **Revisa** la pestaña "Details" o "Settings" de la función
2. **Busca** opciones de seguridad o acceso público
3. **Si no encuentras nada**, puede ser necesario:
   - Contactar soporte de Supabase
   - O crear un endpoint proxy público que redirija a la función

---

**¿Puedes revisar la pestaña "Details" de la función y buscar opciones de "Public Access" o "Security"?** 🚀


