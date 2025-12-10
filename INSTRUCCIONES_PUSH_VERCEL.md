# 📋 INSTRUCCIONES PARA PUSH A VERCEL

## ✅ ARCHIVOS CRÍTICOS QUE DEBEN SUBIRSE

### 1. Migraciones SQL (NUEVAS)
- `supabase/migrations/029_motivational_phrases_schema.sql`
- `supabase/migrations/030_fix_get_next_phrase_for_user.sql`
- `supabase/migrations/031_fix_motivational_phrases_rls.sql`

### 2. Código Frontend (MODIFICADOS)
- `src/App.jsx` (frases motivacionales, optimizaciones)
- `src/services/motivationalPhrases.js` (nuevo servicio)

### 3. Otros archivos modificados
- `src/components/CitySummary.jsx`
- `src/components/SaleForm.jsx`
- `src/supabaseStorage.js`
- `src/utils/authProvider.js`
- `src/utils/dataProvider.js`
- `src/supabaseClient.js`
- Y otros archivos modificados

## 🚀 COMANDOS PARA EJECUTAR

### Opción 1: Subir TODO (recomendado)
```bash
git add .
git commit -m "feat: Sistema de frases motivacionales + migración completa a Supabase

- Agregado sistema de frases motivacionales con Supabase
- Migraciones SQL: 029, 030, 031
- Optimizaciones en App.jsx para evitar múltiples ejecuciones
- Corrección de políticas RLS para frases
- 100% Supabase (Firebase/Cloudinary solo como fallback)"
git push origin main
```

### Opción 2: Subir solo archivos críticos (si hay problemas)
```bash
# Agregar solo archivos críticos
git add src/App.jsx
git add src/services/motivationalPhrases.js
git add supabase/migrations/029_motivational_phrases_schema.sql
git add supabase/migrations/030_fix_get_next_phrase_for_user.sql
git add supabase/migrations/031_fix_motivational_phrases_rls.sql
git add src/components/CitySummary.jsx
git add src/components/SaleForm.jsx
git add src/supabaseStorage.js
git add src/utils/authProvider.js
git add src/utils/dataProvider.js
git add src/supabaseClient.js

# Commit
git commit -m "feat: Sistema de frases motivacionales + Supabase 100%"

# Push
git push origin main
```

## ⚠️ IMPORTANTE

1. **Variables de entorno en Vercel:**
   - Asegúrate de tener `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas
   - Si usas Cloudinary en producción, también `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

2. **Migraciones SQL:**
   - Ejecuta las migraciones 029, 030 y 031 en Supabase Dashboard antes o después del deploy

3. **Verificación:**
   - Después del deploy, verifica que la app funcione correctamente
   - Verifica que las frases se puedan agregar desde el menú "Frases"

## 📝 NOTAS

- El código está configurado para usar Supabase 100%
- Firebase y Cloudinary solo se usan como fallback si Supabase no está configurado
- En Vercel, asegúrate de tener las variables de Supabase configuradas


