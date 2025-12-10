# ✅ Subir Política de Privacidad a tu Dominio

## 🎯 Ventajas de Usar tu Dominio

✅ **Más profesional:** `https://www.mayalife.shop/privacy-policy`  
✅ **Consistente con tu marca:** Todo en tu dominio  
✅ **Control total:** Tú decides cuándo cambiar  
✅ **SEO mejor:** Tu dominio gana autoridad  
✅ **Sin dependencias externas:** No depende de servicios de terceros

---

## 📋 Opciones para Subirla a mayalife.shop

### **OPCIÓN 1: Subir como archivo estático en Vercel** ⭐ RECOMENDADO

Si tu sitio está en Vercel, puedes subirla fácilmente:

#### **PASO 1: Preparar el archivo**

1. Renombra `politica-privacidad.html` a `privacy-policy.html`
2. O mantén el nombre que prefieras

#### **PASO 2: Subir a Vercel**

**Si usas Git (GitHub/GitLab):**

1. **Agrega el archivo a tu repositorio:**
   ```bash
   git add politica-privacidad/index.html
   git commit -m "Agregar política de privacidad"
   git push
   ```

2. **En Vercel:**
   - Ve a tu proyecto en Vercel Dashboard
   - El deploy se hará automáticamente
   - La URL será: `https://www.mayalife.shop/politica-privacidad/index.html`
   - O mejor: `https://www.mayalife.shop/privacy-policy.html`

**Si subes manualmente:**

1. Ve a Vercel Dashboard → Tu proyecto
2. Ve a **Settings** → **Functions** o **Deployments**
3. Sube el archivo a la carpeta `public/` o raíz del proyecto

---

### **OPCIÓN 2: Crear carpeta pública en el proyecto**

#### **PASO 1: Crear carpeta public**

Si tu proyecto usa Vite (como parece), puedes crear:

```
tu-proyecto/
├── public/
│   └── privacy-policy.html  (o politica-privacidad.html)
└── src/
```

#### **PASO 2: Copiar archivo**

1. Copia `politica-privacidad/index.html`
2. Renómbralo a `privacy-policy.html` (o el nombre que prefieras)
3. Colócalo en la carpeta `public/` de tu proyecto

#### **PASO 3: Deploy**

1. Haz commit y push
2. Vercel hará deploy automático
3. Accede a: `https://www.mayalife.shop/privacy-policy.html`

---

### **OPCIÓN 3: Crear ruta en tu aplicación React**

Si quieres que sea parte de tu aplicación React:

1. Crea una ruta `/privacy-policy`
2. Renderiza el contenido HTML
3. O redirige a un archivo estático

---

## 🚀 Pasos Recomendados (Más Simple)

### **1. Copiar archivo a carpeta public**

```bash
# Desde tu proyecto
mkdir -p public
cp politica-privacidad/index.html public/privacy-policy.html
```

### **2. Git commit y push**

```bash
git add public/privacy-policy.html
git commit -m "Agregar política de privacidad"
git push
```

### **3. Vercel deploy automático**

- Vercel detectará el cambio
- Hará deploy automáticamente
- Tu URL será: `https://www.mayalife.shop/privacy-policy.html`

---

## 📝 Configurar URL en Facebook

Una vez que el archivo esté en línea:

1. **URL final será:**
   ```
   https://www.mayalife.shop/privacy-policy.html
   ```
   O si prefieres:
   ```
   https://www.mayalife.shop/politica-privacidad/
   ```

2. **En Facebook Developer Console:**
   - Settings → Basic
   - "URL de la política de privacidad"
   - Pega la URL: `https://www.mayalife.shop/privacy-policy.html`
   - Guarda cambios

---

## 🔍 Verificar Cuenta de Vercel

**Para verificar cómo está registrado tu proyecto en Vercel:**

1. Ve a: https://vercel.com/dashboard
2. Inicia sesión (puede ser con GitHub, GitLab, o email)
3. Busca el proyecto de `mayalife.shop`
4. Verás:
   - El email asociado
   - El repositorio conectado
   - Los dominios configurados

**O si prefieres, puedo ayudarte a:**
- Verificar si tienes acceso al proyecto
- Ver la estructura de carpetas
- Configurar la subida correctamente

---

## 📋 Checklist

- [ ] Archivo `privacy-policy.html` en carpeta `public/`
- [ ] Commit y push a repositorio
- [ ] Vercel deploy automático completado
- [ ] Verificar URL funciona: `https://www.mayalife.shop/privacy-policy.html`
- [ ] Agregar URL en Facebook Developer Console
- [ ] Guardar cambios en Facebook

---

## ✅ URL Final Recomendada

**Opción 1 (Simple):**
```
https://www.mayalife.shop/privacy-policy.html
```

**Opción 2 (Más organizada):**
```
https://www.mayalife.shop/privacy-policy/
```
(Requiere crear una carpeta y `index.html` dentro)

---

**¿Quieres que te ayude a subirlo ahora? Puedo ayudarte a:**
1. Preparar el archivo en la estructura correcta
2. Crear la carpeta `public/` si no existe
3. Dar instrucciones específicas según tu configuración de Vercel

**¿Cómo está configurado tu proyecto? ¿Usas Git con Vercel o despliegues manuales?** 🚀


