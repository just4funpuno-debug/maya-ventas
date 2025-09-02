# Lecciones Aprendidas / Errores Frecuentes

Documento para futuros proyectos: checklist de cosas que fallaron aquí y cómo evitarlas.

## 1. Autenticación y Usuarios

- Componente de login borrado accidentalmente → app inutilizable.
  - Prevención: prueba de humo automatizada que verifique render de formulario y login básico.
- Búsqueda de usuario solo por `username` → usuarios existentes sin ese campo no entraban.
  - Prevención: normalizar y aceptar username/email/nombre.
- Merge remoto sobrescribiendo password admin con `null`.
  - Prevención: no sobreescribir campos sensibles con valores falsy; merge defensivo.
- Falta de usuario admin seed garantizado.
  - Prevención: función idempotente que reinyecta admin si falta.

## 2. Sincronización y Realtime

- Productos sin canal Realtime (solo ventas) → divergencias entre dispositivos.
  - Prevención: para cada tabla sincronizada implementar: upsert saliente + suscripción entrante antes de lanzar.
- Reset global dependía de tabla `resets` sin migración/políticas/publicación en producción.
  - Prevención: migración versionada + script de verificación (tabla existe, políticas, publicación Realtime) en inicio.

## 3. SQL / Políticas RLS

- Uso de `CREATE POLICY IF NOT EXISTS` (no soportado) → error 42601.
  - Prevención: patrón correcto = `DROP POLICY IF EXISTS` seguido de `CREATE POLICY`.
- Políticas demasiado abiertas sin plan de cierre.
  - Prevención: documentar fase “abierta” y ticket con fecha para restringir (solo admin / authenticated).

## 4. Variables de Entorno y Build

- Falta de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en Vercel al build → `supabase=null` (usingCloud=false).
  - Prevención: checklist de despliegue + log inicial que avise si faltan.
- Secret `CLOUDINARY_API_SECRET` expuesto en frontend.
  - Prevención: no exponer secrets en código cliente; usar funciones serverless; `.gitignore` para `.env*`.

## 5. Lógica de Código

- Variable incorrecta (`sb` en vez de `supabase`) en segundo paso de reset.
  - Prevención: TypeScript / ESLint `no-undef`.
- Falta de logs estructurados para reset y Realtime.
  - Prevención: convención de prefijo `[reset-sync]` / `[RT <tabla>]`.
- Heurística de limpieza (nube vacía) añadida tarde.
  - Prevención: diseñar fallback (polling + heurística) desde el inicio para operaciones críticas.

## 6. LocalStorage y Cuotas

- Imágenes grandes base64 guardadas sin compresión → riesgo de quota.
  - Prevención: redimensionar/comprimir antes de persistir; fallback sin imagen; métrica de uso.
- Limpieza global borrando claves necesarias (e.g., marca lastSeen reset).
  - Prevención: lista blanca explícita.

## 7. Migraciones / Infraestructura

- Migraciones manuales ad-hoc, riesgo de olvidar en producción.
  - Prevención: scripts versionados (`security-reset-policies.sql`) y proceso “aplicar antes de deploy”.
- No verificación de publicación Realtime para tablas nuevas.
  - Prevención: query a `pg_publication_tables` tras migrar; script con DO block idempotente.

## 8. UX / Feedback

- Reset global sin feedback visual consistente (solo alert local).
  - Prevención: toast/notice global para acciones multi-dispositivo.

## 9. Robustez Reset

- No persistir timestamp lastSeen antes de wipe → posibles re-wipes.
  - Prevención: guardar marca inicial; idempotencia.

## 10. Checklist Pre-Deploy

1. `.env.example` actualizado y presente.
2. Variables definidas en plataforma (Vercel) antes del build.
3. Login test (admin + seller) ok.
4. CRUD producto y venta multi-pestaña con propagación Realtime.
5. Script de migraciones ejecutado (tablas + políticas + publicación).
6. Reset global dispara evento en segundo navegador.
7. No secrets en bundle (revisar con `grep -R "API_SECRET" dist`).
8. Consola sin errores rojos al cargar.

## 11. Plantilla de Migración (Ejemplo Seguro)

```sql
-- Crear tabla
create table if not exists public.resets(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.resets enable row level security;
drop policy if exists resets_select_all on public.resets;
drop policy if exists resets_insert_all on public.resets;
create policy resets_select_all on public.resets for select using (true);
create policy resets_insert_all on public.resets for insert with check (true);
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.resets';
  exception when duplicate_object then null; end;
end $$;
```

## 12. Acciones Futuras Recomendadas

- Migrar a Supabase Auth real y restringir resets a rol admin.
- Añadir tests E2E mínimos (Playwright): login, crear venta, reset multi-tab.
- Tipar el proyecto (TypeScript) para reducir errores silenciosos.
- Mover secretos Cloudinary a función serverless (firma).

## 13. Eliminación de Productos ("Resurrección")

Problema: Al borrar un producto desaparecía localmente pero reaparecía tras refrescar u en otra máquina. La fila en la nube nunca se eliminaba, por lo que al siguiente sync el producto regresaba ("resurrección").

Raíces específicas:

1. ReferenceError: la función `remove` usaba variables inexistentes (`usingCloud` / `cloudReady`) → excepción silenciosa en producción (solo se veía en consola) y abortaba antes del `delete` remoto.
2. Carrera con upsert diferido: un debounce de sincronización podía todavía ejecutar un upsert del producto ya marcado para eliminación, recreándolo si se había alcanzado a borrar.
3. Falta de verificación de filas afectadas: no se chequeaba si el `delete` realmente borró (affected=1) para registrar éxito o fallback.
4. Sin reconciliación periódica: si se perdía un evento Realtime DELETE (o fallaba el delete remoto) no había mecanismo de poda eventual hasta que recargabas manualmente.

Solución aplicada:

- Reescritura de `remove(p)` usando un flag seguro `hasCloud` y eliminando referencias a variables no definidas.
- Intento de delete por `id` y fallback por `sku`, solicitando `select('id')` para conocer `count` real y loguear `[products] eliminado remoto filas:`.
- Logs claros de fallo para diagnóstico rápido.
- Efecto de reconciliación periódico (fetch remoto y poda local de ids/skus inexistentes) → consistencia eventual incluso si se pierde un evento.

Prevención futura:

- Activar ESLint/TypeScript para detectar `no-undef` antes de build.
- Cancelar / invalidar debounced upsert cuando se encola una eliminación (o marcar estado `deleted` hasta confirmar).
- Siempre loggear y verificar `count` en operaciones críticas (delete/update) y reaccionar si es 0.
- Añadir test E2E: crear producto A, abrir segunda pestaña, borrar en una, confirmar desaparición (<10s) en la otra.

Indicador de éxito: aparición de log `[products] eliminado remoto filas: 1 <sku>` y recepción de evento `[realtime products] DELETE` en la otra pestaña; producto no vuelve tras 2 ciclos de reconciliación.

---

Mantén este archivo vivo; actualiza cada nuevo incidente.
