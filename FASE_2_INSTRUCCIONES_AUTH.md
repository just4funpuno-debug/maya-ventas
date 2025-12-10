# 🔐 Fase 2.2: Instrucciones para Migración de Auth

## ✅ Subfase 2.1 Completada

**Datos de usuarios migrados:** 3/3 ✅

---

## 📋 Subfase 2.2: Migración de Firebase Auth → Supabase Auth

### ⚠️ IMPORTANTE: Necesitas SERVICE_ROLE_KEY

Para migrar usuarios a Supabase Auth, necesitas la **SERVICE_ROLE_KEY** (no la anon key).

### 🔑 Cómo Obtener SERVICE_ROLE_KEY

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Settings → API**
3. Busca la sección **"Project API keys"**
4. Copia la **`service_role`** key (⚠️ **NUNCA** la compartas públicamente)

### 📝 Agregar al .env.local

Agrega esta línea a tu `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**⚠️ ADVERTENCIA DE SEGURIDAD:**
- La SERVICE_ROLE_KEY tiene permisos completos
- **NUNCA** la subas a Git
- **NUNCA** la uses en el frontend
- Solo úsala en scripts de migración del servidor

---

## 🔄 Proceso de Migración de Auth

### Limitación de Firebase Auth

**Firebase Auth NO permite leer contraseñas** por seguridad. Esto significa que:

1. ✅ Podemos crear usuarios en Supabase Auth
2. ⚠️ Pero necesitamos generar contraseñas temporales
3. ⚠️ Los usuarios deberán cambiar su contraseña al iniciar sesión

### Opciones:

**Opción A: Contraseñas Temporales (Recomendada)**
- El script genera contraseñas temporales
- Los usuarios deben usar "Olvidé mi contraseña" o cambiar al iniciar sesión
- Más seguro y automático

**Opción B: Pedir a Usuarios que Cambien Contraseña**
- Comunicar a usuarios que deben cambiar su contraseña
- Usar función de "Olvidé mi contraseña" de Supabase

---

## 🚀 Ejecutar Migración de Auth

Una vez que tengas la SERVICE_ROLE_KEY en `.env.local`:

```bash
npm run migration:users-auth
```

El script:
1. Listará todos los usuarios de Firebase Auth
2. Los creará en Supabase Auth con contraseñas temporales
3. Generará un archivo con las contraseñas temporales (solo para referencia)
4. Mostrará qué usuarios necesitan cambiar su contraseña

---

## 📝 Después de la Migración

1. **Comunicar a usuarios:** Deben usar "Olvidé mi contraseña" o cambiar su contraseña
2. **Probar login:** Verificar que pueden iniciar sesión en Supabase
3. **Dual-write (Fase 2.3):** Implementar escritura en ambos sistemas durante transición

---

## ✅ Checklist

- [ ] Obtener SERVICE_ROLE_KEY de Supabase
- [ ] Agregar a `.env.local`
- [ ] Ejecutar `npm run migration:users-auth`
- [ ] Verificar que usuarios se crearon en Supabase Auth
- [ ] Comunicar a usuarios sobre cambio de contraseña

---

**¿Tienes la SERVICE_ROLE_KEY?** Una vez que la agregues a `.env.local`, podemos ejecutar la migración de Auth.



