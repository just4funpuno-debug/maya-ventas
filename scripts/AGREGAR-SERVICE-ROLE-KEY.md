# Agregar SUPABASE_SERVICE_ROLE_KEY

## ⚠️ Importante

El script de migración necesita la **Service Role Key** de Supabase para poder insertar datos directamente.

## Pasos para obtener la Service Role Key

1. **Ve al Dashboard de Supabase**: https://supabase.com/dashboard
2. **Selecciona tu proyecto** (el que estás usando para localhost)
3. **Ve a Settings** → **API**
4. **Busca la sección "Project API keys"**
5. **Copia la "service_role" key** (⚠️ **NO** la "anon" key)
   - La service_role key es secreta y tiene permisos completos
   - La anon key es pública y tiene permisos limitados

## Agregar al .env.local

Agrega esta línea a tu archivo `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Ejemplo:**
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## ⚠️ Seguridad

- **NO** subas el archivo `.env.local` a Git
- **NO** compartas la service_role key públicamente
- Esta key tiene permisos completos en tu base de datos

## Después de agregar

Ejecuta nuevamente:
```bash
node scripts/migrate-deposits-complete.js
```


