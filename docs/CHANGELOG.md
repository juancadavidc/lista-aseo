# Changelog — Casa Limpia

> Este archivo se actualiza en cada iteración para rastrear el progreso contra el [Roadmap de Visión](../CLAUDE.md#roadmap-de-visión).

## Estado Actual: Fase 0 (MVP) — COMPLETADA | Fase 1 — COMPLETADA | Fase 2 — EN PROGRESO

---

## [Fase 0] — MVP Fundacional

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
