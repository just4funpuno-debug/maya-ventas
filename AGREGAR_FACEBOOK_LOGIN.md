# 🔧 Agregar Facebook Login para OAuth Redirect URIs

## 🎯 Problema

No encuentras "Valid OAuth Redirect URIs" porque necesitas agregar el producto **"Facebook Login"** primero.

---

## ✅ Solución: Agregar Facebook Login

### PASO 1: Ir a Productos

1. **En el menú lateral izquierdo:** Busca **"Productos"** (Products)
2. **Haz clic en "Productos"**
3. **O haz clic en "Agregar producto"** (el enlace azul que ves)

### PASO 2: Buscar Facebook Login

1. **Verás una lista de productos disponibles**
2. **Busca "Facebook Login"** en la lista
   - Puede estar como "Inicio de sesión con Facebook" en español
   - O "Facebook Login" en inglés
3. **Haz clic en "Configurar"** o **"Set Up"** junto a Facebook Login

### PASO 3: Configurar Facebook Login

1. **Se abrirá la configuración de Facebook Login**
2. **En el menú lateral izquierdo:** Busca **"Settings"** o **"Configuración"**
3. **Haz clic en "Settings"**

### PASO 4: Encontrar Valid OAuth Redirect URIs

1. **Ahora deberías ver la sección "Valid OAuth Redirect URIs"**
2. **O "URI de redirección OAuth válidos"** (en español)
3. **Haz clic en "Add URI"** o **"Agregar URI"**

### PASO 5: Agregar tu Redirect URI

1. **Pega este URI exacto:**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
2. **Haz clic en "Save Changes"** o **"Guardar cambios"**

---

## 📋 Ruta Completa

```
Meta Developer Console
  → Productos (Products)
    → Facebook Login
      → Configurar (Set Up)
        → Settings (Configuración)
          → Valid OAuth Redirect URIs
            → Add URI
              → Pegar URI
                → Save Changes
```

---

## 🎯 Alternativa: Desde el Menú Lateral

Si ya agregaste Facebook Login antes:

1. **En el menú lateral izquierdo:** Busca **"Facebook Login"**
   - Debería aparecer bajo "Productos"
2. **Haz clic en "Facebook Login"**
3. **Ve a "Settings"** o **"Configuración"**
4. **Busca "Valid OAuth Redirect URIs"**

---

## ✅ Verificación

Después de agregar el URI, deberías ver:

```
Valid OAuth Redirect URIs:
  ✓ https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

---

## 🐛 Si Aún No Lo Encuentras

### Opción 1: Buscar en "Advanced" (Avanzada)

1. **Ve a:** Settings > **"Advanced"** o **"Avanzada"**
2. **Busca:** "Valid OAuth Redirect URIs"

### Opción 2: Usar la Barra de Búsqueda

1. **En la parte superior de Meta Developer Console:** Hay una barra de búsqueda
2. **Busca:** "OAuth Redirect" o "Redirect URI"
3. **Te llevará directamente a la sección**

---

## 📸 Ubicación Visual

**En el menú lateral deberías ver:**
```
Productos
  ├─ WhatsApp (ya lo tienes)
  └─ Facebook Login ← Agregar este
      └─ Settings
          └─ Valid OAuth Redirect URIs ← Aquí está
```

---

**¿Ya agregaste Facebook Login? ¿Puedes ver la sección "Valid OAuth Redirect URIs" ahora?**

Avísame y te guío para agregar el URI correcto.

