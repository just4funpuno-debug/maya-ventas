# ✅ Probar OAuth - Paso Final

## ✅ Estado: Todo Configurado

- ✅ Facebook: Redirect URI agregado y validado
- ✅ Supabase: Secrets configurados (META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI)
- ✅ Frontend: Variables en .env.local

---

## 🔧 PASO 1: Verificar Edge Function

### 1.1. Verificar que está desplegado

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
2. Busca: `meta-oauth-callback`
3. Si existe → ✅ Listo
4. Si NO existe → Necesitamos desplegarlo

---

## 🔧 PASO 2: Reiniciar Servidor (Importante)

**⚠️ IMPORTANTE:** Las variables de entorno solo se cargan al iniciar el servidor.

1. **Detén el servidor** (si está corriendo):
   - Presiona `Ctrl+C` en la terminal

2. **Inicia el servidor de nuevo:**
   ```bash
   npm run dev
   ```

3. **Espera** a que el servidor esté listo

---

## ✅ PASO 3: Probar OAuth

1. **Abre tu CRM** en el navegador

2. **Ve a:**
   - Menú → **⚙️ Configuración WhatsApp**
   - O directamente: **WhatsApp** → **Administración**

3. **Haz clic en:**
   - **"Nueva Cuenta"** o **"Agregar Cuenta"**

4. **En el formulario:**
   - Haz clic en el botón **"Conectar con Meta"**

5. **Debería:**
   - ✅ Abrir una ventana/popup de Facebook
   - ✅ Mostrar pantalla de autorización
   - ✅ Pedirte que autorices los permisos

6. **Si autorizas:**
   - ✅ El popup se cierra automáticamente
   - ✅ El formulario se llena automáticamente con:
     - Phone Number ID
     - Business Account ID
     - Phone Number
     - Display Name

7. **Si requiere coexistencia:**
   - Aparecerá un modal con QR para escanear
   - Escanea con tu WhatsApp Business

---

## ❓ Si hay problemas

### Error: "META_APP_ID no configurado"
- **Solución:** Reinicia el servidor (PASO 2)

### Error: "Invalid redirect_uri"
- **Verifica:** Que guardaste los cambios en Facebook
- **Verifica:** Que la URI en Facebook es exactamente igual

### El popup no se abre
- **Verifica:** Que no tienes bloqueador de popups activado
- **Verifica:** Que el servidor está corriendo

### Error: "OAuth cancelado por el usuario"
- **Normal:** Si cerraste la ventana, inténtalo de nuevo

---

## 🎉 Si funciona

¡Felicitaciones! Ya tienes OAuth funcionando. Ahora puedes:
- ✅ Conectar cuentas automáticamente
- ✅ Sin copiar/pegar datos manualmente
- ✅ Con coexistencia automática

---

**¿Reiniciaste el servidor? ¿Probaste el botón "Conectar con Meta"?** 🚀


