# 🔍 Debug: Popup se Cierra Solo

## ❌ Problema

El popup se cierra solo después de hacer clic en "Reconectar", mostrando "OAuth cancelado por el usuario".

---

## 🔍 Posibles Causas

1. **La Edge Function está redirigiendo, pero el archivo `oauth-callback.html` no se carga correctamente**
2. **Hay un error en la Edge Function que causa una redirección incorrecta**
3. **El popup se cierra antes de que el mensaje se envíe**

---

## ✅ Verificaciones

### **1. Verificar Logs de la Edge Function**

1. **Ve a:** Supabase Dashboard → Edge Functions → `meta-oauth-callback` → **"Logs"**
2. **Busca logs recientes** después de hacer clic en "Reconectar"
3. **Busca:**
   - `[Frontend URL]` - Para ver qué URL está usando
   - `[Respuesta] Redirigiendo al frontend` - Para ver la URL de redirección
   - Errores relacionados con Graph API o Phone Numbers

---

### **2. Verificar que oauth-callback.html Esté Accesible**

1. **Abre en tu navegador:** `http://localhost:5173/oauth-callback.html`
2. **Debería cargar** la página (aunque no tenga hash, mostrará un mensaje)
3. **Si da 404**, el archivo no está en la carpeta `public` correctamente

---

### **3. Revisar la URL de Redirección**

En los logs de la Edge Function, busca la URL de redirección. Debería ser:
```
http://localhost:5173/oauth-callback.html#oauth-callback=...
```

**Si es diferente**, ahí está el problema.

---

## 💡 Solución Temporal: Mejorar Detección de Cierre

Puedo mejorar el código para:
1. Esperar más tiempo antes de detectar que se cerró
2. Verificar si hay un error en la redirección
3. Mostrar más información de debug

---

**¿Puedes revisar los logs de la Edge Function y decirme qué URL está usando para redirigir?** 🚀


