# Code Graph — Casa Limpia

_Generado automaticamente por `scripts/codegraph.js` el 2026-08-30T14:47:36.168Z._

**No editar a mano.** Regenerar con `npm run codegraph` despues de cambios en `server/` o `db/init.sql`.

## Resumen

| Metrica | Valor |
|---|---|
| Rutas registradas | 53 |
| Queries en rutas (estaticas) | 84 |
| Queries dinamicas (SQL en variable) | 6 |
| Queries con filtro `organization_id` | 64 |
| Helpers con queries | 6 |
| Tablas en schema | 11 |
| Tablas referenciadas (incl. externas) | 16 |

## Queries sin filtro multi-tenant (revisar)

Queries que tocan tablas con `organization_id` pero no lo filtran:

- `GET /api/super-admin/stats` (server/index.js:109) — SELECT `tasks`
- `DELETE /api/push/subscribe` (server/index.js:1340) — DELETE `push_subscriptions`

## API → Handler → SQL

### /api/auth

**`ALL /api/auth/*`** — server/index.js:81

- _Sin queries directas._

### /api/completions

**`GET /api/completions`** — server/index.js:630 _[requireAuth, requireHouse]_

- [OK] L632 SELECT → `completions, tasks`

**`POST /api/completions`** — server/index.js:646 _[requireAuth, requireHouse]_

- [OK] L650 SELECT → `tasks`
- [OK] L659 SELECT → `visits`
-      L676 INSERT → `completions`
- [OK] L683 UPDATE → `tasks`

**`GET /api/completions/:taskId/history`** — server/index.js:766 _[requireAuth, requireHouse]_

- [OK] L769 SELECT → `completions, tasks`

### /api/health

**`GET /api/health`** — server/index.js:506

-      L508 SELECT

### /api/houses

**`GET /api/houses/members`** — server/index.js:160 _[requireAuth, requireHouse]_

- [OK] L162 SELECT → `member, user, house_member_profiles`

**`PATCH /api/houses/members/:userId/type`** — server/index.js:183 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L190 SELECT → `member`
- [OK] L197 INSERT → `house_member_profiles`

**`GET /api/houses/profile`** — server/index.js:212 _[requireAuth, requireHouse]_

- [OK] L214 SELECT → `house_member_profiles`

**`PUT /api/houses/profile`** — server/index.js:231 _[requireAuth, requireHouse]_

- [OK] L237 SELECT → `house_member_profiles`
- [OK] L245 INSERT → `house_member_profiles`

**`DELETE /api/houses/:id`** — server/index.js:311 _[requireAuth]_

-      L318 SELECT → `member`
-      L329 BEGIN
- [OK] L331 DELETE → `tasks`
- [OK] L332 DELETE → `products`
- [OK] L333 DELETE → `shopping_items`
- [OK] L334 DELETE → `shopping_categories`
- [OK] L335 DELETE → `house_member_profiles`
- [OK] L336 DELETE → `push_subscriptions`
- [OK] L337 DELETE → `plant_watering_history, plants`
- [OK] L341 DELETE → `plants`
-      L343 DELETE → `invitation`
-      L344 DELETE → `member`
-      L345 DELETE → `organization`
-      L346 COMMIT
-      L350 ROLLBACK

**`POST /api/houses/seed`** — server/index.js:358 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L365 SELECT → `tasks`
- [OK] L401 INSERT → `tasks`
- [OK] L437 INSERT → `tasks`
- [OK] L493 INSERT → `products`

### /api/invitations

**`GET /api/invitations`** — server/index.js:259 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L261 SELECT → `invitation, user`

**`DELETE /api/invitations/:id`** — server/index.js:276 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L278 DELETE → `invitation`

**`POST /api/invitations/:id/renew`** — server/index.js:292 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L294 UPDATE → `invitation`

### /api/plants

**`GET /api/plants`** — server/index.js:1098 _[requireAuth, requireHouse]_

- [OK] L1100 SELECT → `plants`

**`POST /api/plants`** — server/index.js:1111 _[requireAuth, requireHouse]_

- [OK] L1116 INSERT → `plants`

**`PATCH /api/plants/:id`** — server/index.js:1128 _[requireAuth, requireHouse]_

- [OK] L1135 UPDATE → `plants`

**`DELETE /api/plants/:id`** — server/index.js:1148 _[requireAuth, requireHouse]_

- [OK] L1151 DELETE → `plants`

**`POST /api/plants/:id/water`** — server/index.js:1163 _[requireAuth, requireHouse]_

- [OK] L1167 SELECT → `plants`
-      L1173 BEGIN
-      L1174 INSERT → `plant_watering_history`
- [OK] L1178 UPDATE → `plants`
-      L1182 COMMIT
-      L1192 ROLLBACK

**`GET /api/plants/:id/history`** — server/index.js:1200 _[requireAuth, requireHouse]_

- [OK] L1203 SELECT → `plant_watering_history, plants`

### /api/products

**`GET /api/products`** — server/index.js:784 _[requireAuth, requireHouse]_

- L800 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products`** — server/index.js:808 _[requireAuth, requireHouse]_

- [OK] L812 INSERT → `products`

**`PATCH /api/products/:id`** — server/index.js:824 _[requireAuth, requireHouse]_

- L840 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products/:id/purchase`** — server/index.js:849 _[requireAuth, requireHouse]_

- [OK] L852 UPDATE → `products`

**`DELETE /api/products/:id`** — server/index.js:866 _[requireAuth, requireHouse]_

- [OK] L869 DELETE → `products`

### /api/push

**`GET /api/push/vapid-key`** — server/index.js:1304

- _Sin queries directas._

**`POST /api/push/subscribe`** — server/index.js:1311 _[requireAuth, requireHouse]_

- [OK] L1318 INSERT → `push_subscriptions`

**`DELETE /api/push/subscribe`** — server/index.js:1336 _[requireAuth]_

- [!!] L1340 DELETE → `push_subscriptions`

**`GET /api/push/status`** — server/index.js:1348 _[requireAuth, requireHouse]_

- [OK] L1350 SELECT → `push_subscriptions`

### /api/shopping-categories

**`GET /api/shopping-categories`** — server/index.js:879 _[requireAuth, requireHouse]_

- [OK] L881 SELECT → `shopping_categories`

**`POST /api/shopping-categories`** — server/index.js:892 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L897 SELECT → `shopping_categories`
- [OK] L901 INSERT → `shopping_categories`

**`PATCH /api/shopping-categories/:id`** — server/index.js:912 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L922 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-categories/:id`** — server/index.js:931 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L934 DELETE → `shopping_categories`

### /api/shopping-items

**`GET /api/shopping-items`** — server/index.js:944 _[requireAuth, requireHouse]_

- [OK] L947 UPDATE → `shopping_items`
- [OK] L958 SELECT → `shopping_items, shopping_categories`

**`POST /api/shopping-items`** — server/index.js:972 _[requireAuth, requireHouse]_

- [OK] L976 INSERT → `shopping_items`

**`PATCH /api/shopping-items/:id`** — server/index.js:987 _[requireAuth, requireHouse]_

- L1009 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-items/clear-purchased`** — server/index.js:1019 _[requireAuth, requireHouse]_

- [OK] L1022 UPDATE → `shopping_items`

**`GET /api/shopping-items/history`** — server/index.js:1039 _[requireAuth, requireHouse]_

- [OK] L1042 SELECT → `shopping_items, shopping_categories`

**`GET /api/shopping-items/recommendations`** — server/index.js:1058 _[requireAuth, requireHouse]_

- [OK] L1060 SELECT → `shopping_items, shopping_categories`
- [OK] L1071 SELECT → `shopping_items`

**`DELETE /api/shopping-items/:id`** — server/index.js:1085 _[requireAuth, requireHouse]_

- [OK] L1088 DELETE → `shopping_items`

### /api/stats

**`GET /api/stats/participation`** — server/index.js:1218 _[requireAuth, requireHouse]_

- [OK] L1229 SELECT → `completions, tasks, house_member_profiles`
- [OK] L1249 SELECT → `completions, tasks`
- [OK] L1262 SELECT → `completions, tasks`

### /api/super-admin

**`GET /api/super-admin/check`** — server/index.js:90 _[requireAuth]_

-      L92 SELECT → `super_admins`

**`GET /api/super-admin/stats`** — server/index.js:103 _[requireAuth, requireSuperAdmin]_

-      L106 SELECT → `user`
-      L107 SELECT → `organization`
-      L108 SELECT → `member`
- [!!] L109 SELECT → `tasks`
-      L110 SELECT → `completions`
-      L111 SELECT → `completions`
- [OK] L118 SELECT → `organization, member, tasks, completions`

### /api/tasks

**`GET /api/tasks/pending`** — server/index.js:534 _[requireAuth, requireHouse]_

- [OK] L536 SELECT → `tasks, completions`

**`GET /api/tasks`** — server/index.js:560 _[requireAuth, requireHouse]_

- L566 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/tasks`** — server/index.js:575 _[requireAuth, requireHouse, denyExternalMembers]_

- [OK] L578 INSERT → `tasks`

**`PATCH /api/tasks/:id`** — server/index.js:590 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L600 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/tasks/:id`** — server/index.js:609 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L612 SELECT → `tasks`
-      L619 DELETE → `completions`
- [OK] L620 DELETE → `tasks`

**`POST /api/tasks/:id/reset`** — server/index.js:751 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L754 UPDATE → `tasks`

### /api/uploads

**`POST /api/uploads`** — server/index.js:517 _[requireAuth, upload.single('image')]_

- _Sin queries directas._

**`DELETE /api/uploads/:filename`** — server/index.js:522 _[requireAuth]_

- _Sin queries directas._

### /api/visits

**`GET /api/visits/active`** — server/index.js:709 _[requireAuth, requireHouse]_

- [OK] L711 SELECT → `visits`

**`POST /api/visits`** — server/index.js:725 _[requireAuth, requireHouse]_

-      L734 SELECT
- [OK] L738 INSERT → `visits`

## Helpers / factories con queries

**`sendPushToHouse`** — server/index.js:1361

- L1365 SELECT → `push_subscriptions` (filtra org)
- L1379 DELETE → `push_subscriptions`

**`migrate`** — server/index.js:1391

- L1394 CREATE (filtra org)
- L1409 CREATE
- L1418 CREATE
- L1419 CREATE
- L1421 CREATE (filtra org)
- L1433 CREATE
- L1434 CREATE
- L1436 CREATE (filtra org)
- L1446 CREATE (filtra org)
- L1448 CREATE (filtra org)
- L1460 CREATE
- L1461 CREATE
- L1483 CREATE (filtra org)
- L1484 CREATE (filtra org)
- L1485 CREATE (filtra org)
- L1489 CREATE
- L1500 CREATE
- L1501 CREATE
- L1504 CREATE (filtra org)
- L1518 CREATE (filtra org)
- L1527 CREATE (filtra org)
- L1530 CREATE
- L1539 CREATE (filtra org)
- L1550 CREATE (filtra org)
- L1552 CREATE
- L1561 CREATE
- L1562 CREATE
- L1565 CREATE (filtra org)
- L1577 CREATE (filtra org)
- L1578 CREATE

**`addColumnIfMissing`** — server/index.js:1589

- L1590 SELECT
- L1595 ALTER

**`migrateAccountIssuer`** — server/lib/auth-schema-migration.js:17

- L18 SELECT
- L23 SELECT
- L29 ALTER
- L30 UPDATE → `account`
- L37 ALTER
- L38 CREATE

**`requireHouse`** — server/lib/middleware.js:54

- L59 SELECT → `member, house_member_profiles` (filtra org)

**`requireSuperAdmin`** — server/lib/middleware.js:82

- L84 SELECT → `super_admins`

## Tablas → Endpoints

### `account` _(externa — better-auth u otra fuente)_

- **Escritores (1):**
    - helper `migrateAccountIssuer` (server/lib/auth-schema-migration.js:30, UPDATE) [sin filtro org]

### `completions`

- **Columnas:** `id` UUID, `task_id` UUID, `completed_at` TIMESTAMPTZ, `completed_by` TEXT, `user_id` TEXT
- **FK:** `task_id` → `tasks.id`
- **Multi-tenant:** no
- **Lectores (9):**
    - `GET /api/super-admin/stats` (server/index.js:110, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:111, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:118, SELECT)
    - `GET /api/tasks/pending` (server/index.js:536, SELECT)
    - `GET /api/completions` (server/index.js:632, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:769, SELECT)
    - `GET /api/stats/participation` (server/index.js:1229, SELECT)
    - `GET /api/stats/participation` (server/index.js:1249, SELECT)
    - `GET /api/stats/participation` (server/index.js:1262, SELECT)
- **Escritores (2):**
    - `DELETE /api/tasks/:id` (server/index.js:619, DELETE) [sin filtro org]
    - `POST /api/completions` (server/index.js:676, INSERT) [sin filtro org]

### `house_member_profiles`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `avatar` TEXT, `color` TEXT, `home_screen` TEXT, `member_type` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/houses/members` (server/index.js:162, SELECT)
    - `GET /api/houses/profile` (server/index.js:214, SELECT)
    - `PUT /api/houses/profile` (server/index.js:237, SELECT)
    - `GET /api/stats/participation` (server/index.js:1229, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:59, SELECT)
- **Escritores (3):**
    - `PATCH /api/houses/members/:userId/type` (server/index.js:197, INSERT)
    - `PUT /api/houses/profile` (server/index.js:245, INSERT)
    - `DELETE /api/houses/:id` (server/index.js:335, DELETE)

### `invitation` _(externa — better-auth u otra fuente)_

- **Lectores (1):**
    - `GET /api/invitations` (server/index.js:261, SELECT)
- **Escritores (3):**
    - `DELETE /api/invitations/:id` (server/index.js:278, DELETE)
    - `POST /api/invitations/:id/renew` (server/index.js:294, UPDATE)
    - `DELETE /api/houses/:id` (server/index.js:343, DELETE)

### `member` _(externa — better-auth u otra fuente)_

- **Lectores (6):**
    - `GET /api/super-admin/stats` (server/index.js:108, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:118, SELECT)
    - `GET /api/houses/members` (server/index.js:162, SELECT)
    - `PATCH /api/houses/members/:userId/type` (server/index.js:190, SELECT)
    - `DELETE /api/houses/:id` (server/index.js:318, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:59, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:344, DELETE)

### `organization` _(externa — better-auth u otra fuente)_

- **Lectores (2):**
    - `GET /api/super-admin/stats` (server/index.js:107, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:118, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:345, DELETE) [sin filtro org]

### `plant_watering_history`

- **Columnas:** `id` UUID, `plant_id` UUID, `watered_at` TIMESTAMPTZ, `watered_by` TEXT, `user_id` TEXT
- **FK:** `plant_id` → `plants.id`
- **Multi-tenant:** no
- **Lectores (1):**
    - `GET /api/plants/:id/history` (server/index.js:1203, SELECT)
- **Escritores (2):**
    - `DELETE /api/houses/:id` (server/index.js:337, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1174, INSERT) [sin filtro org]

### `plants`

- **Columnas:** `id` UUID, `name` TEXT, `notes` TEXT, `watering_frequency_days` INTEGER, `last_watered_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (3):**
    - `GET /api/plants` (server/index.js:1100, SELECT)
    - `POST /api/plants/:id/water` (server/index.js:1167, SELECT)
    - `GET /api/plants/:id/history` (server/index.js:1203, SELECT)
- **Escritores (6):**
    - `DELETE /api/houses/:id` (server/index.js:337, DELETE)
    - `DELETE /api/houses/:id` (server/index.js:341, DELETE)
    - `POST /api/plants` (server/index.js:1116, INSERT)
    - `PATCH /api/plants/:id` (server/index.js:1135, UPDATE)
    - `DELETE /api/plants/:id` (server/index.js:1151, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1178, UPDATE)

### `products`

- **Columnas:** `id` UUID, `name` TEXT, `category` TEXT, `is_out_of_stock` BOOLEAN, `reminder_frequency_days` INTEGER, `units` INTEGER, `last_purchased_at` TIMESTAMPTZ, `last_out_of_stock_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:332, DELETE)
    - `POST /api/houses/seed` (server/index.js:493, INSERT)
    - `POST /api/products` (server/index.js:812, INSERT)
    - `POST /api/products/:id/purchase` (server/index.js:852, UPDATE)
    - `DELETE /api/products/:id` (server/index.js:869, DELETE)

### `push_subscriptions`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `endpoint` TEXT, `keys_p256dh` TEXT, `keys_auth` TEXT, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `GET /api/push/status` (server/index.js:1350, SELECT)
    - helper `sendPushToHouse` (server/index.js:1365, SELECT)
- **Escritores (4):**
    - `DELETE /api/houses/:id` (server/index.js:336, DELETE)
    - `POST /api/push/subscribe` (server/index.js:1318, INSERT)
    - `DELETE /api/push/subscribe` (server/index.js:1340, DELETE) [sin filtro org]
    - helper `sendPushToHouse` (server/index.js:1379, DELETE) [sin filtro org]

### `shopping_categories`

- **Columnas:** `id` UUID, `name` TEXT, `emoji` TEXT, `sort_order` INTEGER, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/shopping-categories` (server/index.js:881, SELECT)
    - `POST /api/shopping-categories` (server/index.js:897, SELECT)
    - `GET /api/shopping-items` (server/index.js:958, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:1042, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1060, SELECT)
- **Escritores (3):**
    - `DELETE /api/houses/:id` (server/index.js:334, DELETE)
    - `POST /api/shopping-categories` (server/index.js:901, INSERT)
    - `DELETE /api/shopping-categories/:id` (server/index.js:934, DELETE)

### `shopping_items`

- **Columnas:** `id` UUID, `name` TEXT, `note` TEXT, `added_by` TEXT, `is_purchased` BOOLEAN, `category_id` UUID, `organization_id` TEXT, `purchased_at` TIMESTAMPTZ, `archived_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **FK:** `category_id` → `shopping_categories.id`
- **Multi-tenant:** si (organization_id)
- **Lectores (4):**
    - `GET /api/shopping-items` (server/index.js:958, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:1042, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1060, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1071, SELECT)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:333, DELETE)
    - `GET /api/shopping-items` (server/index.js:947, UPDATE)
    - `POST /api/shopping-items` (server/index.js:976, INSERT)
    - `DELETE /api/shopping-items/clear-purchased` (server/index.js:1022, UPDATE)
    - `DELETE /api/shopping-items/:id` (server/index.js:1088, DELETE)

### `super_admins`

- **Columnas:** `id` UUID, `user_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** no
- **Lectores (2):**
    - `GET /api/super-admin/check` (server/index.js:92, SELECT) [sin filtro org]
    - helper `requireSuperAdmin` (server/lib/middleware.js:84, SELECT) [sin filtro org]

### `tasks`

- **Columnas:** `id` UUID, `name` TEXT, `description` TEXT, `frequency_type` TEXT, `frequency_value` INTEGER, `is_active` BOOLEAN, `product_name` TEXT, `product_image` TEXT, `organization_id` TEXT, `last_reset_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (11):**
    - `GET /api/super-admin/stats` (server/index.js:109, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:118, SELECT)
    - `POST /api/houses/seed` (server/index.js:365, SELECT)
    - `GET /api/tasks/pending` (server/index.js:536, SELECT)
    - `DELETE /api/tasks/:id` (server/index.js:612, SELECT)
    - `GET /api/completions` (server/index.js:632, SELECT)
    - `POST /api/completions` (server/index.js:650, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:769, SELECT)
    - `GET /api/stats/participation` (server/index.js:1229, SELECT)
    - `GET /api/stats/participation` (server/index.js:1249, SELECT)
    - `GET /api/stats/participation` (server/index.js:1262, SELECT)
- **Escritores (7):**
    - `DELETE /api/houses/:id` (server/index.js:331, DELETE)
    - `POST /api/houses/seed` (server/index.js:401, INSERT)
    - `POST /api/houses/seed` (server/index.js:437, INSERT)
    - `POST /api/tasks` (server/index.js:578, INSERT)
    - `DELETE /api/tasks/:id` (server/index.js:620, DELETE)
    - `POST /api/completions` (server/index.js:683, UPDATE)
    - `POST /api/tasks/:id/reset` (server/index.js:754, UPDATE)

### `user` _(externa — better-auth u otra fuente)_

- **Lectores (3):**
    - `GET /api/super-admin/stats` (server/index.js:106, SELECT) [sin filtro org]
    - `GET /api/houses/members` (server/index.js:162, SELECT)
    - `GET /api/invitations` (server/index.js:261, SELECT)

### `visits`

- **Columnas:** `id` UUID, `organization_id` TEXT, `user_id` TEXT, `visited_on` DATE, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `POST /api/completions` (server/index.js:659, SELECT)
    - `GET /api/visits/active` (server/index.js:711, SELECT)
- **Escritores (1):**
    - `POST /api/visits` (server/index.js:738, INSERT)

