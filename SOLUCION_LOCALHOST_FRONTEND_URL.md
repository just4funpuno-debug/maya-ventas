# ✅ Solución: Detectar Localhost vs Producción

## 🔧 Cambios Realizados

### **1. Frontend: Incluir URL en State**

El `generateOAuthState()` ahora incluye la URL del frontend en el state:
- Si estás en `localhost:5173` → incluye `http://localhost:5173`
- Si estás en producción → incluye `https://www.mayalife.shop`

### **2. Edge Function: Leer URL del State**

La Edge Function ahora:
1. Primero intenta leer `FRONTEND_URL` de variables de entorno
2. Si no existe, decodifica el state para obtener la URL del frontend
3. Si tampoco funciona, detecta automáticamente (localhost o producción)

---

## 🚀 Cómo Funciona

### **Flujo:**

1. **Frontend genera state:**
   ```javascript
   {
     uuid: "abc-123...",
     frontend: "http://localhost:5173"  // o "https://www.mayalife.shop"
   }
   ```

2. **Facebook redirige a Edge Function** con el state

3. **Edge Function decodifica el state** y obtiene la URL del frontend

4. **Edge Function redirige** al frontend correcto:
   - Localhost: `http://localhost:5173/oauth-callback.html`
   - Producción: `https://www.mayalife.shop/oauth-callback.html`

---

## 📋 Próximos Pasos

1. **Redesplegar la Edge Function** con el código actualizado
2. **Probar el OAuth desde localhost**
3. **Debería redirigir** a `http://localhost:5173/oauth-callback.html`

---

**¿Listo para redesplegar y probar?** 🚀


