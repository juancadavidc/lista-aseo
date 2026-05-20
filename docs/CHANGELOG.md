# Changelog — Casa Limpia

> Este archivo se actualiza en cada iteración para rastrear el progreso contra el [Roadmap de Visión](../CLAUDE.md#roadmap-de-visión).

## Estado Actual: Fase 0 (MVP) — COMPLETADA | Fase 1 — COMPLETADA | Fase 2 — EN PROGRESO

---

## [Fase 2] — Experiencias Agénticas

### 2026-05-20 — Fix: la PWA en iOS no recibía actualizaciones (caché)
- **Problema** — Tras mergear el fix de zoom en inputs, la PWA instalada en iOS seguía mostrando la versión vieja. Causa raíz: el `nginx.conf` no enviaba `Cache-Control` para `index.html` ni `sw.js`, así que iOS los cacheaba indefinidamente y nunca pedía los assets hasheados nuevos. Sumado a un `CACHE_NAME` fijo en el Service Worker, la app quedaba pegada en el build anterior.
- **`nginx.conf` — política de caché correcta** — `/assets/*` (archivos con hash de Vite) se sirven `immutable` con `expires 1y`; `index.html` y todas las rutas SPA se sirven con `Cache-Control: no-cache`; `sw.js` con `no-cache` para que el navegador detecte cada nuevo deploy.
- **`sw.js` — versionado de caché** — `CACHE_NAME` sube de `v1` a `v2`. Al cambiar los bytes del SW, el navegador lo reinstala y el handler `activate` purga el caché viejo (`v1`); con `skipWaiting()` + `clients.claim()` ya existentes, el SW nuevo toma control de inmediato.
- **`index.html` — auto-recarga al actualizar** — listener `controllerchange` con guard `refreshing` recarga la página una sola vez cuando un nuevo Service Worker toma control, así el usuario ve el build nuevo sin tener que cerrar la PWA manualmente.
- **Acción manual única requerida** — Los dispositivos que ya tienen el SW viejo cacheado necesitan forzar una limpieza una vez (cerrar la PWA del todo y reabrir con red, o desinstalar/reinstalar). A partir de este deploy, las futuras actualizaciones llegan solas.
- Archivos: `frontend/nginx.conf`, `frontend/public/sw.js`, `frontend/index.html`.

### 2026-05-19 — Fix: zoom automático en inputs en iOS Safari (PWA)
- **Problema** — Safari en iOS aplica zoom automático e irreversible al enfocar cualquier campo editable cuyo `font-size` computado sea menor a 16px. La app usaba `text-[14px]` y `text-[13px]` en inputs/textareas/selects, rompiendo la UX en PWA instalada.
- **Red de seguridad global** — Regla `@supports (-webkit-touch-callout: none)` en `frontend/src/index.css` que fuerza `font-size: 16px` en `input`/`textarea`/`select`/`[contenteditable=true]` solo en iOS, excluyendo tipos no editables (checkbox, radio, range, file, submit, button, reset). Esto preserva tamaños en desktop si en el futuro alguien introduce un input pequeño por error.
- **Corrección directa por elemento** — Las 29 instancias con `text-[14px]` o `text-[13px]` se elevaron a `text-[16px]` en `SearchInput`, `TaskForm` (5 campos), `Login` (2), `Register` (4), `HouseSelect` (1), `HouseSettings` (1 invite; el rename ya estaba a 28px), `Plants` (1 select sort, 1 nombre, 1 textarea notas, 1 number frequency), `Products` (1 select sort, 1 nombre, 4 number units/frequency), `ShoppingAdmin` (2), `ShoppingList` (1 nombre, 1 select categoría, 1 nota), `ShoppingHistory` (1 select filtro).
- **Accesibilidad preservada** — Se confirmó que el meta viewport en `frontend/index.html` mantiene `initial-scale=1.0` sin `maximum-scale` ni `user-scalable=no`, así que el usuario sigue pudiendo hacer pinch-to-zoom.
- **Jerarquía visual** — La diferencia de 14→16px es mínima (2px) y los inputs ya tenían padding similar; los selects compactos (13→16px) crecen ligeramente pero no rompen la composición. No se usó `transform: scale()` porque la diferencia visual no lo amerita.
- **Sin contentEditable ni rich-text editors** en el código actual (verificado).
- **Tests** — 155/155 tests pasan, build de Vite verde (417 kB, 23 kB CSS gzip 5.82 kB).
- Archivos: `frontend/src/index.css`, `frontend/src/components/SearchInput.jsx`, `frontend/src/components/TaskForm.jsx`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/HouseSelect.jsx`, `frontend/src/pages/HouseSettings.jsx`, `frontend/src/pages/Plants.jsx`, `frontend/src/pages/Products.jsx`, `frontend/src/pages/ShoppingAdmin.jsx`, `frontend/src/pages/ShoppingList.jsx`, `frontend/src/pages/ShoppingHistory.jsx`.

### 2026-05-17 — Archivado de compras + recomendador por periodicidad
- **Compras dejan historial en vez de borrarse** — `shopping_items` gana columnas `purchased_at` (se setea automaticamente al marcar `is_purchased=true`, se limpia al desmarcar) y `archived_at` (marca el item como archivado, lo saca de la lista activa). Migracion automatica en `migrate()` + `init.sql` para installs nuevos.
- **Auto-archivado lazy a los 7 dias** — `GET /api/shopping-items` corre un `UPDATE` previo que archiva los comprados con `purchased_at` mayor a 7 dias. Sin cron, sin worker: aprovecha el trafico normal de la lista. La lista activa filtra por `archived_at IS NULL`.
- **`DELETE /shopping-items/clear-purchased` ahora archiva** — antes borraba (perdiamos historial). Ahora hace `UPDATE … SET archived_at = NOW()`, y rellena `purchased_at` con `COALESCE` para items legacy sin timestamp. El boton del frontend se renombro a "Archivar".
- **`GET /api/shopping-items/recommendations`** — analiza items archivados agrupados por nombre normalizado (sin acentos, lower). Para cada grupo con >= 2 compras calcula la **mediana** de los intervalos historicos, predice la proxima compra y la incluye si esta dentro de la ventana de tolerancia (3 dias antes o vencida). Excluye items que ya estan en la lista activa. Mediana > media para resistir outliers (compras compulsivas no rompen la frecuencia base).
- **`GET /api/shopping-items/history`** — items archivados, ordenados por `archived_at DESC`, limite 1-500 (default 100).
- **Seccion "Sugeridos para volver a comprar" en `/shopping`** — colapsable, muestra emoji de categoria, status (`Vencido hace N dias` / `Toca recomprar` / `En N dias`), intervalo promedio y veces compradas. Cada sugerencia tiene boton `+ Agregar` (hereda category_id del historico) y `X` para descartar en la sesion.
- **Nueva pagina `/shopping/history`** — historial agrupado por mes, con buscador y filtro por categoria. Acceso desde un nuevo boton (icono de reloj con flecha circular) en el header de la lista.
- **Hardening de seguridad** — `purchased_at` y `archived_at` agregados al whitelist `SHOPPING_ITEM_UPDATABLE_COLUMNS`, pero el handler `PATCH /shopping-items/:id` sobreescribe lo que mande el cliente cuando viene `is_purchased`, para garantizar consistencia. Multi-tenant respetado: todas las queries filtran por `req.house.id` (regla critica #1) y usan parametros (#2).
- **Tests** — `server/lib/shopping-recommendations.test.js` cubre normalizacion, exclusion de items activos, ordenamiento por urgencia, mediana vs media, requisito de >= 2 compras y tolerancia de ventana. `frontend/src/pages/__tests__/ShoppingList.test.jsx` extiende mocks y agrega 3 casos: render de la seccion, click en "Agregar" sobre una recomendacion y ausencia de la seccion cuando no hay recomendaciones.
- **Cierra una sub-meta de Fase 2** — junto con Smart Tags y el recomendador de tareas en onboarding, completa la trilogia de experiencias agenticas sobre compras/tareas. Habilita futuras notificaciones push tipo "se acerca tu recompra de X" sin trabajo adicional de modelado.
- Archivos: `db/init.sql`, `server/index.js`, `server/lib/patch-update.js`, `server/lib/shopping-recommendations.js` (nuevo), `server/lib/shopping-recommendations.test.js` (nuevo), `frontend/src/lib/api.js`, `frontend/src/pages/ShoppingList.jsx`, `frontend/src/pages/ShoppingHistory.jsx` (nuevo), `frontend/src/main.jsx`.

---

## [Fase 0] — MVP Fundacional

### 2026-05-01 — Gestión de invitaciones pendientes
- **Sección "Invitaciones pendientes" en Configuración de la casa** — owners y admins ven, debajo del formulario de invitar, la lista de invitaciones con estado `pending`: email, rol y tiempo restante hasta la expiración (formato relativo: "Expira en 3 dias", "Expira manana", "Expirada" en clay si ya venció).
- **Renovar invitación** — botón con icono de refresco extiende `expiresAt` por 7 días desde ahora (`POST /api/invitations/:id/renew`). Útil cuando la invitación expiró y quieres darle nueva vida sin reinvitar desde cero.
- **Eliminar invitación** — botón X con doble-tap de confirmación (3s timeout, mismo patrón que eliminar miembro y eliminar casa) revoca una invitación pendiente (`DELETE /api/invitations/:id`).
- **Endpoints backend protegidos** — `GET/DELETE/POST /api/invitations*` con stack `requireAuth → requireHouse → requireRole('owner','admin')`. Toda query filtra por `req.house.id` (regla crítica #1 multi-tenant) y `status = 'pending'`. SQL parametrizado (regla crítica #2).
- **Refresh automático** — al enviar una nueva invitación desde el formulario existente, la lista se recarga sin necesidad de recargar la página.
- Archivos: `server/index.js` (3 endpoints nuevos sobre tabla better-auth `"invitation"`), `frontend/src/lib/api.js` (`fetchInvitations`, `renewInvitation`, `deleteInvitation`), `frontend/src/pages/HouseSettings.jsx` (nueva sección y handlers).

### 2026-05-01 — Navegación con menú hamburguesa
- **Reemplazo de la nav scrollable por drawer lateral** — el header ya no muestra una barra horizontal con scroll para acceder a los módulos (Tareas, Stats, Productos, Plantas, Compras, Admin, Casa). Ahora un botón hamburguesa abre un drawer desde la izquierda con todos los módulos como items grandes.
- **Mejora UX mobile** — tap targets ≥ 44px, indicador visual del módulo activo (barra lateral con `activeColor` de cada módulo), backdrop con blur, cierre con tap fuera / Escape / selección de item, `body` con `overflow:hidden` mientras el drawer está abierto.
- **Espacio recuperado en el header** — al quitar la nav scrollable, el nombre de la casa vuelve a ser visible en el header junto al logo.
- **Animación** — `drawer-slide-in` (translateX desde -100%, easing `cubic-bezier(0.16, 1, 0.3, 1)`).
- Archivos: `frontend/src/components/Layout.jsx`, `frontend/src/index.css` (limpieza de `.nav-scroll` y nueva keyframe `drawerSlideIn`).

### 2026-05-01 — Hardening de PATCH endpoints + refinamiento del gate sql-safety (#22)
- **Whitelist de columnas en PATCH** — los 4 endpoints `PATCH /api/tasks/:id`, `PATCH /api/products/:id`, `PATCH /api/shopping-categories/:id` y `PATCH /api/shopping-items/:id` validan los keys del body contra una lista cerrada por tabla. Keys desconocidas devuelven `400 { error: 'Campos no permitidos: …' }` en lugar de inyectarse al SQL.
- **Helper `server/lib/patch-update.js`** — `buildPatchUpdate(table, fields, allowedColumns)` centraliza la construcción del UPDATE parcial (whitelist de tabla + whitelist de columnas + valores parametrizados). El SET clause se compone con `+` (no template literal), cumpliendo el gate `sql-safety` sin escapes.
- **Gate `sql-safety` revisa solo el diff** — `scripts/ci/check-sql-safety.sh` ahora analiza únicamente las líneas agregadas por el PR (mismo patrón que `check-multi-tenant.sh`) y soporta el escape `// @allow-dynamic-sql` para SQL controlado por código (migraciones, seeds, `dateFilter` de stats). Elimina los falsos positivos sobre código preexistente seguro en `server/index.js`.
- **Tests** — `lib/patch-update.test.js` cubre: build con whitelist, rechazo de keys desconocidas (incluyendo intento de inyección con SQL crudo en la key), tabla fuera del whitelist, body vacío y los 4 whitelists exportados.
- **Cumple regla crítica #2 del `CLAUDE.md`** y desbloquea PRs futuros sobre `server/index.js`.

### 2026-04-30 — Gestión de plantas (extensión MVP)
- **Nueva entidad `plants`** — tabla con `name`, `notes`, `watering_frequency_days` (default 7), `last_watered_at`, `organization_id`. Multi-tenant filtrado por `organization_id` en todas las queries (regla crítica #1).
- **Historial de riego (`plant_watering_history`)** — registra cada riego con `watered_at`, `watered_by`, `user_id`. FK a `plants` con `ON DELETE CASCADE`.
- **Endpoints REST** — `GET/POST /api/plants`, `PATCH/DELETE /api/plants/:id`, `POST /api/plants/:id/water` (atómico: inserta historial + actualiza `last_watered_at`), `GET /api/plants/:id/history`.
- **Página `/plantas`** — lista con tarjetas, indicador de estado calculado en frontend (vencido / regar hoy / regar mañana / faltan N días / sin regar), badge de frecuencia, botón "Regué esta planta" (1 tap), modal de historial cronológico, formulario con presets (Diario / Cada 3 días / Semanal / Quincenal). Búsqueda y ordenamiento aparecen al tener ≥ 4 plantas.
- **Push notification** al regar una planta, reusando `sendPushToHouse` con tag `plant-watered`.
- **Limpieza al eliminar casa** — `DELETE /api/houses/:id` borra primero `plant_watering_history` y luego `plants` de la organización dentro de la transacción.
- **Migración automática** — `migrate()` crea las tablas `plants` y `plant_watering_history` con sus índices si no existen.
- **Tests** — wrappers del API client (`fetchPlants`, `createPlant`, `updatePlant`, `deletePlant`, `waterPlant`, `fetchPlantHistory`) y página `Plants` (estado vacío, indicador de vencido / sin regar, alta, registro de riego, apertura de historial).

### 2026-04-08 — Reorganización estratégica
- Creado rol de CEO/CTO con visión de producto y roadmap de monetización
- Separada documentación técnica en `docs/TECHNICAL.md`
- Creado este changelog para tracking de progreso por fase

### Historial del MVP (features entregadas)
- **Super Admin Dashboard** — Panel global con métricas de la app (#10)
- **Categorías de compras** — Organizar items por tienda/tipo (#9)
- **Sync de avatar** — Foto de perfil se actualiza en navegación (#7)
- **Personalización** — Opciones de customización y renombrar casa (#6)
- **Multi-tenant + login** — Autenticación, casas, Google OAuth (#5)
- **Core** — Tareas con frecuencias, productos, lista de compras, perfiles

### Capacidades actuales
- Gestión de tareas de aseo con frecuencias (diaria/semanal/quincenal/mensual)
- Inventario de productos de limpieza con alertas de recompra
- Lista de compras con categorías
- Multi-tenant (múltiples casas por usuario)
- Perfiles personalizados por miembro (avatar + color)
- Panel de super admin con métricas globales
- Auth con Google OAuth + sesiones

---

## [Fase 1] — Retención y Engagement (EN PROGRESO)

**Objetivo:** Lograr que los usuarios vuelvan a la app regularmente.

### 2026-04-08 — Fase 1 completa
- **PWA / Install prompt** — manifest.json, service worker con cache, banner de instalacion
- **Estadísticas de participación** — Nueva página Stats con distribución por miembro, gráfica de actividad diaria, top tareas. Selector de periodo (7 días/30 días/todo)
- **Onboarding con templates** — Al crear casa, se elige plantilla: Apartamento (8 tareas), Casa familiar (16 tareas), o Personalizado (vacío)
- **Notificaciones push** — Web Push con VAPID, toggle en configuración de casa, notifica cuando alguien completa una tarea. Requiere env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

| Feature | Estado | PR |
|---------|--------|----|
| Estadísticas de participación | Completado | — |
| Notificaciones push | Completado | — |
| PWA / Install prompt | Completado | — |
| Onboarding con templates | Completado | — |

---

## [Fase 2] — Experiencias Agénticas (EN PROGRESO)

**Objetivo:** Features inteligentes que den valor inmediato y diferencien de una lista simple.

### 2026-04-25 — DevEx: gates de PR (SQL seguro, multi-tenant, CHANGELOG, audit)
- **Nuevo workflow `pr-checks.yml`** — Se separan los checks de calidad de código del workflow `ci.yml` (que sigue corriendo tests, build y coverage). Se ejecuta en cada PR a `main` y cada gate aparece como check independiente en la UI de GitHub, de modo que un reviewer puede ver exactamente qué falló.
- **Gate SQL seguro** — `scripts/ci/check-sql-safety.sh` detecta interpolación de variables dentro de `.query()` (regla crítica #2 del CLAUDE.md). Revisa los archivos de `server/` modificados en el diff contra `main` y falla si encuentra template literals con `${...}` dentro de una llamada a `.query()`. Mensaje sugiere usar parameterized queries (`$1, $2...`).
- **Gate multi-tenant** — `scripts/ci/check-multi-tenant.sh` revisa, sobre las líneas **agregadas** en el diff, que toda query sobre tablas multi-tenant (`tasks`, `products`, `shopping_items`, `shopping_categories`, `house_member_profiles`, `push_subscriptions`) incluya `organization_id` en una ventana de ±15 líneas. Escape hatch explícito: marcar la línea con `// @allow-cross-tenant` para casos intencionales (ej. queries de super-admin globales).
- **Gate CHANGELOG** — `scripts/ci/check-changelog.sh` falla si el PR toca `frontend/` o `server/` (excluyendo tests) pero no actualiza `docs/CHANGELOG.md`. Cumple con la regla crítica #8 ("changelog obligatorio").
- **Gate `npm audit`** — Corre `npm audit --omit=dev --audit-level=high` en `frontend/` y `server/` para cortar dependencias con vulnerabilidades conocidas antes de mergear.

### 2026-04-25 — UI quick wins: búsqueda, agrupación, ordenamiento y validación
- **Escala completa de tokens CSS** — Se definieron los tokens que se usaban pero no existían y caían al fallback: `--bark-200`, `--bark-500`, `--clay-400`, `--moss-100..600`. Además se agregaron niveles intermedios de urgencia (`--urgency-critical`, `--urgency-medium`) para estados que no podían representarse con sólo `high`/`low`.
- **`TaskCard` usa los 3 niveles de urgencia** — `getUrgencyColor` ahora distingue: **critical** (≥ 7 días de retraso), **high** (1-6 días o nunca completada), **medium** ("desde ayer"), **low** (recién). Antes solo se pintaba binario.
- **Agrupación por urgencia en Home** — Las tareas pendientes se muestran separadas en dos grupos con headers propios: **Atrasadas** (≥ 2 días) y **Del día** (< 2 días). Helper `urgencyBucket(task, lastCompletedAt)` en `lib/tasks.js`.
- **Búsqueda en Home, ShoppingList y Products** — Nuevo componente reutilizable `components/SearchInput.jsx` con icono, botón clear y estilo consistente. Aparece cuando hay ≥ 5 ítems (≥ 4 en Products). Busca por nombre, descripción, producto asociado, nota o categoría. Estado "Sin resultados" dedicado.
- **Ordenamiento en Products** — Dropdown al lado del search con tres modos: **Urgencia** (default: critical→low, tie-break por días restantes), **Próximo a agotarse** (por `daysUntilNeeded`), **Nombre (A-Z)** con `localeCompare` en español.
- **Validación viva en `TaskForm`** — Icono verde ✓ aparece en el campo **Nombre** cuando hay ≥ 2 caracteres y en **Días** cuando es un entero entre 1 y 365. Si los días son inválidos se pinta el borde de clay y se muestra mensaje de ayuda.

### 2026-04-23 — Unidades por compra + detección de consumo acelerado
- **Unidades por compra** — Nueva columna `products.units INTEGER NOT NULL DEFAULT 1` para registrar cuántas unidades se compran por vez (ej: 4 rollos, 2 frascos). Campo en el formulario de producto y badge visible en el card cuando `units > 1`.
- **Detección de "agotado antes de tiempo"** — Nueva columna `products.last_out_of_stock_at TIMESTAMPTZ`. El endpoint `PATCH /api/products/:id` ahora sincroniza automáticamente este timestamp cuando se cambia `is_out_of_stock`; `POST /api/products/:id/purchase` lo limpia al comprar.
- **Modal inteligente** — Al marcar un producto como agotado, si la duración real fue menor al 60% de la frecuencia configurada (`EARLY_OUT_OF_STOCK_RATIO = 0.6`), se abre un modal que ofrece dos ajustes: actualizar unidades o actualizar frecuencia (pre-llenada con la duración real observada). Tercera opción "Solo agotarlo" para descartar. No se guarda historial acumulado — sólo se detecta el caso inmediato comparando `last_purchased_at` vs ahora.
- **Migraciones automáticas:** `addColumnIfMissing('products', 'units', ...)` y `addColumnIfMissing('products', 'last_out_of_stock_at', ...)` en el arranque del servidor.

### 2026-04-18 — Fix: Resetear tarea ya no borra el historial
- **Bug:** El botón "Resetear" en Administración borraba todos los registros de `completions` de la tarea para hacerla reaparecer (dependía de `last_completed_at IS NULL`). Resultado: se perdía el historial completo de quién hizo la tarea y cuándo.
- **Fix:** Nueva columna `tasks.last_reset_at TIMESTAMPTZ`. El endpoint ahora es `POST /api/tasks/:id/reset` (antes `DELETE /api/completions?task_id=...`) y sólo actualiza `last_reset_at = NOW()`. La query `/api/tasks/pending` incluye la tarea cuando `last_reset_at > last_completed_at`, preservando intacto el historial de completions.
- **Migración automática:** `addColumnIfMissing('tasks', 'last_reset_at', 'TIMESTAMPTZ')` en el arranque del servidor para instalaciones existentes.

### 2026-04-13 — DevEx: pre-commit hook + CI de tests y coverage
- **CI `ci.yml` agregado** — Workflow que corre en cada PR y push a `main`: instala dependencias (`frontend`, `server`, root), ejecuta `npm test` (ambos proyectos), `npm run build` (frontend) y `npm run test:coverage` con thresholds. Previamente solo existía `build-and-push.yml` que construía Docker sin validar nada.
- **Pre-commit hook (Husky)** — `.husky/pre-commit` corre `npm test` + `npm run build` antes de cada commit para cortar temprano lo que rompería CI.
- **Backend refactor testeable** — Extraídos middlewares a `server/lib/middleware.js` como factories (`createRequireAuth`, `createRequireHouse`, `createRequireSuperAdmin`) + helpers puros (`requireRole`, `isAllowedImageExtension`). Inyección de `auth` y `pool` como dependencias.
- **Tests backend (28)** — `server/lib/middleware.test.js` cubre multi-tenant (verificación `organization_id`), roles, auth y validación de imágenes. Coverage `lib/` al 100%.
- **Coverage transparente** — `frontend/vitest.config.js` con `all: true` reporta cobertura real del proyecto, no solo archivos con tests.
- **Tests frontend `lib/` (~94 nuevos)** — Nuevas suites para `lib/house.js` (localStorage helpers, constantes), `lib/tasks.js` (helpers puros `frequencyToHours`, `isTaskPending`, `overdueLabel`, `frequencyLabel` + wrappers mockeados), `lib/api.js` (fetch mockeado, cubre `request()` con paths 401/non-ok/JSON-invalido, todos los wrappers de tareas/productos/compras/stats/push/admin/casas, y `uploadProductImage` con FormData) y `components/ProgressRing.jsx`.
- **Coverage frontend: 7.52% → 17.77% líneas** (17.33% stmts, 19.03% funcs, 12.14% branches). Carpeta `lib/` en 97.9%. Thresholds actualizados a `lines:17 / stmts:17 / funcs:18 / branches:11` para prevenir regresión.

### 2026-04-13 — Borrado de casas
- **Eliminar casa desde configuración** — Nueva sección "Zona de peligro" en `/house-settings` visible solo para el dueño, con botón dual-click ("Seguro?") para confirmar. Endpoint `DELETE /api/houses/:id` protegido con verificación de rol `owner`, limpia en transacción tareas, productos, lista de compras, categorías, perfiles de miembros, push subscriptions, invitaciones, miembros y la organización.

### 2026-04-13 — Borrado de casas
- **Eliminar casa desde Configuración** — Nueva sección "Zona de peligro" en `/house-settings`, visible solo para el `owner`. Botón con patrón dual-click ("Seguro? Toca de nuevo para confirmar") consistente con el resto de la app. Backend: endpoint `DELETE /api/houses/:id` en transacción que limpia `tasks`, `products`, `shopping_items`, `shopping_categories`, `house_member_profiles`, `push_subscriptions`, `invitation`, `member` y `organization`. Verificación de rol owner antes de borrar.

### 2026-04-08 — Smart Tags + Recomendador de Tareas
- **Smart Tags en lista de compras** — Diccionario de 600+ keywords en español que sugiere categoría automáticamente al escribir un producto. Chip visual que el usuario acepta o descarta. Frontend-only, sin dependencias externas.
- **Recomendador de tareas en onboarding** — Wizard de 2 pasos al crear casa: elegir tipo de espacio (Apartamento, Casa familiar, Airbnb, Oficina, Personalizado) y seleccionar/deseleccionar tareas individuales con checkboxes antes de crear. Backend actualizado para aceptar lista explícita de tareas.

| Feature | Estado | PR |
|---------|--------|----|
| Smart Tags en compras | Completado | — |
| Recomendador de tareas en onboarding | Completado | — |
| Creación de tareas con lenguaje natural | Pendiente | — |

---

## [Fase 3] — Monetización (NO INICIADA)

**Objetivo:** Generar ingresos con tiers de pago.

| Feature | Estado | PR |
|---------|--------|----|
| Sistema de pagos (Stripe) | Pendiente | — |
| Tier Gratis | Pendiente | — |
| Tier Hogar+ | Pendiente | — |
| Tier Pro | Pendiente | — |
| Tier Property | Pendiente | — |

---

## [Fase 4] — Escala (NO INICIADA)

**Objetivo:** Crecer más allá del producto core.

| Feature | Estado | PR |
|---------|--------|----|
| Marketplace de servicios | Pendiente | — |
| Templates por propiedad | Pendiente | — |
| API pública | Pendiente | — |
