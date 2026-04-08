# Changelog — Casa Limpia

> Este archivo se actualiza en cada iteración para rastrear el progreso contra el [Roadmap de Visión](../CLAUDE.md#roadmap-de-visión).

## Estado Actual: Fase 0 (MVP) — COMPLETADA | Fase 1 — COMPLETADA

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

## [Fase 2] — Valor Diferenciado (NO INICIADA)

**Objetivo:** Features que nos separen de una simple lista de tareas.

| Feature | Estado | PR |
|---------|--------|----|
| Rotación automática de tareas | Pendiente | — |
| Alertas inteligentes de recompra | Pendiente | — |
| Verificación con fotos | Pendiente | — |
| Reportes semanales/mensuales | Pendiente | — |

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
