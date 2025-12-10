## 16. Problema de tabla de ventas vacía y migración fallida a router

**Síntoma:**

- El menú “ventas” no mostraba la tabla ni logs, aunque los datos en Firestore eran correctos.
- Al intentar migrar a rutas modernas (react-router), la app mostraba errores de importación y pantalla rota.

**Causas:**

1. El punto de entrada (`main.jsx`) montaba directamente `App.jsx`, que usaba navegación interna por estado (`view`), ignorando el router y las rutas modernas.
2. Al intentar usar el router, faltaban archivos requeridos (`AuthPage.jsx`, `DashboardPage.jsx`, etc.), lo que rompía la app.
3. La lógica de filtrado y normalización de ventasporcobrar en la vista de ventas no era idéntica a la de historial, lo que podía dejar la tabla vacía.

**Solución aplicada:**

- Se restauró el punto de entrada original: `main.jsx` monta solo `App.jsx`, eliminando el router y archivos de rutas modernas.
- Se normalizó y corrigió el filtro de ventasporcobrar en la vista de ventas para igualar la lógica de historial.
- Se eliminaron archivos y stubs innecesarios del router.
- Se validó que la tabla y los logs aparecieran correctamente.

**Lección:**

- Si la app depende de navegación interna por estado, no migrar a router hasta tener todos los componentes y rutas listos.
- Mantener la lógica de filtrado y normalización consistente entre vistas.
- Si la UI desaparece tras una migración, revisar el punto de entrada y los imports rotos.

**Indicador de éxito:**

- La tabla de ventas vuelve a mostrarse y funcionar igual que antes, con todos los datos y logs visibles.

---

### Patrón recomendado: endpoints API universales (local + serverless)

Para que el frontend funcione igual en desarrollo local y en Vercel (o cualquier plataforma serverless), define los endpoints API como rutas relativas (ej: `/api/cloudinary-signature`).

- En local, usa un middleware o proxy en Vite que responda en esa ruta (ver ejemplo en `vite.config.js`).
- En producción (Vercel), crea una función serverless en la carpeta `/api` con el mismo nombre y lógica.
- Configura la variable de entorno en el frontend como:
  ```
  VITE_CLOUDINARY_SIGNATURE_URL=/api/cloudinary-signature
  ```
- Así, el frontend nunca necesita saber si está en local o en la nube: siempre usa la misma ruta.

Ventajas:

- Cero cambios de código ni de variables entre entornos.
- Menos errores de CORS y configuración.
- Más fácil de testear y mantener.

Este patrón es aplicable a cualquier endpoint que debas exponer tanto en local como en serverless (firmas, borrados, uploads, etc).

## 15. Integración local Cloudinary/Express/Vite: errores y solución

**Síntoma:**

- El frontend (Vite/React) no podía comunicarse con el backend local de firmas Cloudinary (Express), mostrando errores de CORS, conexión rechazada o URLs incorrectas.
- El backend se cerraba inesperadamente o no quedaba escuchando en el puerto 4000.
- La variable `VITE_CLOUDINARY_SIGNATURE_URL` estaba mal configurada, apuntando a una ruta inválida.

**Errores observados:**

- `Access to fetch at ... has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present ...`
- `net::ERR_CONNECTION_REFUSED`
- `Cannot GET /api/cloudinary-signature` (cuando el backend está prendido y la ruta es GET)
- `No se puede acceder a este sitio` (cuando el backend está apagado)
- `404 (Not Found)` por URL mal formada en el frontend

**Causas y pasos de depuración:**

1. El backend Express se cerraba porque el script tenía errores o el proceso terminaba inesperadamente. Se simplificó el archivo hasta un servidor mínimo y se fue agregando funcionalidad paso a paso.
2. El middleware de CORS debe estar antes de las rutas y correctamente implementado (se usó manual, no el paquete `cors`).
3. La variable de entorno `VITE_CLOUDINARY_SIGNATURE_URL` debe apuntar exactamente a `http://localhost:4000/api/cloudinary-signature`.
4. Cada vez que se cambia `.env.local`, es obligatorio reiniciar el servidor de Vite para que tome los nuevos valores.
5. Se recomienda tener dos terminales: una para el backend (`node scripts/cloudinary-signature-server.cjs`) y otra para el frontend (`npm run dev -- --host`).
6. Si el backend responde con `Cannot GET ...` es normal para rutas GET en endpoints POST.

**Solución aplicada:**

- Se depuró el backend Express hasta que quedó estable y escuchando correctamente.
- Se corrigió la variable `VITE_CLOUDINARY_SIGNATURE_URL` en `.env.local`.
- Se reinició el frontend tras cada cambio de entorno.
- Se validó la comunicación revisando los logs de CORS y las respuestas del backend.

**Prevención futura:**

- Siempre probar el backend con un endpoint mínimo antes de agregar lógica compleja.
- Documentar y validar las URLs de entorno antes de hacer pruebas de integración.
- Usar logs claros en backend para saber si Express está escuchando y recibiendo peticiones.
- Si hay errores de CORS, revisar primero el orden de los middlewares y la URL de destino.

**Indicador de éxito:**

- El backend queda corriendo y responde a `/` con `OK`.
- El frontend puede subir imágenes y recibe la firma correctamente desde el backend local.

¡Lección aprendida y proceso documentado para futuros proyectos!

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

## 14. Usuarios que "resucitaban" tras eliminarlos

Síntoma: En producción al eliminar un usuario desaparecía unos segundos y luego reaparecía.

Raíz:

1. El flujo de sincronización hacía `upsert` masivo de todos los usuarios locales (snapshot) sin distinción entre activos y eliminados.
2. La eliminación solo quitaba del estado local; si el `delete` remoto fallaba (RLS / id desalineado) el siguiente upsert lo restauraba.

Solución aplicada:

- Handler `performDelete` ahora:
  - Elimina optimistamente del estado local para feedback inmediato.
  - Intenta `delete` por `id`; si 0 filas y hay `username`, reintenta por `username` (caso id cambiado al reconciliar).
  - Usa `select('id')` para contar filas borradas.
  - Si 0 filas: revierte local + alerta para revisar políticas.
  - Logs `[users] delete ...` con `_SYNC_DEBUG`.

Pendientes / mejoras futuras:

- Añadir reconciliación que detecte usuarios locales inexistentes en remoto y los purgue.
- Marcar usuarios en borrado con un tombstone temporal para evitar re-creación incluso si se reinyectan a `users` por algún error.
- Tests E2E: crear → eliminar → confirmar no reaparición tras 2 ciclos de sync.

Lección: El patrón de snapshot + upsert necesita DELETE remoto verificado y (idealmente) un mecanismo anti-resurrección (tombstones / reconciliación inversa).

## Lección: Edición sincronizada de ventas en el menú "Ventas"

- Solo la tabla del menú "Ventas" permite editar ventas confirmadas.
- Al editar una venta desde este menú:
  - Los cambios se reflejan automáticamente en ambas colecciones de Firestore: `ventasporcobrar` y `ventashistorico`.
  - El stock de productos en `cityStock` se ajusta automáticamente:
    - Si se quitan productos, se restauran en el stock de la ciudad.
    - Si se aumentan productos, se descuentan del stock de la ciudad.
  - La venta no reaparece en `VentasSinConfirmar`.
  - El flujo es seguro y atómico para evitar inconsistencias.

**Patrón recomendado:**
Siempre que se requiera mantener consistencia entre colecciones y stock, centralizar la lógica de edición en una función que actualice ambas colecciones y ajuste el stock según la diferencia de productos.

## Patrón: Eliminación segura de ventas confirmadas

Cuando se elimina una venta confirmada desde el modal de edición:

- Se elimina el documento correspondiente en las colecciones `ventasporcobrar` y `ventashistorico`.
- Se restaura el stock de los productos involucrados en la colección `cityStock` (tanto producto principal como extra, si aplica).
- La venta no reaparece en `VentasSinConfirmar`.
- El flujo es seguro y atómico para evitar inconsistencias.

**Implementación:**

- La función `eliminarVentaConfirmada` (en `src/eliminarVentaConfirmada.js`) realiza la eliminación y restauración de stock.
- El botón "Eliminar" del modal de edición llama a esta función si la venta es confirmada.
- Para ventas pendientes, se usa `eliminarVentaPendiente` y solo afecta `VentasSinConfirmar` y el stock.

**Recomendación:**

- Siempre confirmar visualmente antes de eliminar.
- Documentar en el historial de cambios cualquier eliminación relevante para auditoría.
