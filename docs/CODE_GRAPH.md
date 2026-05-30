# Code Graph — Casa Limpia

_Generado automaticamente por `scripts/codegraph.js` el 2026-05-27T23:26:31.706Z._

**No editar a mano.** Regenerar con `npm run codegraph` despues de cambios en `server/` o `db/init.sql`.

## Resumen

| Metrica | Valor |
|---|---|
| Rutas registradas | 50 |
| Queries en rutas (estaticas) | 78 |
| Queries dinamicas (SQL en variable) | 6 |
| Queries con filtro `organization_id` | 59 |
| Helpers con queries | 5 |
| Tablas en schema | 10 |
| Tablas referenciadas (incl. externas) | 14 |

## Queries sin filtro multi-tenant (revisar)

Queries que tocan tablas con `organization_id` pero no lo filtran:

- `GET /api/super-admin/stats` (server/index.js:107) — SELECT `tasks`
- `DELETE /api/push/subscribe` (server/index.js:1240) — DELETE `push_subscriptions`

## API → Handler → SQL

### /api/auth

**`ALL /api/auth/*`** — server/index.js:79

- _Sin queries directas._

### /api/completions

**`GET /api/completions`** — server/index.js:596 _[requireAuth, requireHouse]_

- [OK] L598 SELECT → `completions, tasks`

**`POST /api/completions`** — server/index.js:612 _[requireAuth, requireHouse]_

- [OK] L616 SELECT → `tasks`
-      L621 INSERT → `completions`
- [OK] L628 UPDATE → `tasks`

**`GET /api/completions/:taskId/history`** — server/index.js:666 _[requireAuth, requireHouse]_

- [OK] L669 SELECT → `completions, tasks`

### /api/health

**`GET /api/health`** — server/index.js:473

-      L475 SELECT

### /api/houses

**`GET /api/houses/members`** — server/index.js:158 _[requireAuth, requireHouse]_

- [OK] L160 SELECT → `member, user, house_member_profiles`

**`GET /api/houses/profile`** — server/index.js:180 _[requireAuth, requireHouse]_

- [OK] L182 SELECT → `house_member_profiles`

**`PUT /api/houses/profile`** — server/index.js:198 _[requireAuth, requireHouse]_

- [OK] L204 SELECT → `house_member_profiles`
- [OK] L212 INSERT → `house_member_profiles`

**`DELETE /api/houses/:id`** — server/index.js:278 _[requireAuth]_

-      L285 SELECT → `member`
-      L296 BEGIN
- [OK] L298 DELETE → `tasks`
- [OK] L299 DELETE → `products`
- [OK] L300 DELETE → `shopping_items`
- [OK] L301 DELETE → `shopping_categories`
- [OK] L302 DELETE → `house_member_profiles`
- [OK] L303 DELETE → `push_subscriptions`
- [OK] L304 DELETE → `plant_watering_history, plants`
- [OK] L308 DELETE → `plants`
-      L310 DELETE → `invitation`
-      L311 DELETE → `member`
-      L312 DELETE → `organization`
-      L313 COMMIT
-      L317 ROLLBACK

**`POST /api/houses/seed`** — server/index.js:325 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L332 SELECT → `tasks`
- [OK] L368 INSERT → `tasks`
- [OK] L404 INSERT → `tasks`
- [OK] L460 INSERT → `products`

### /api/invitations

**`GET /api/invitations`** — server/index.js:226 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L228 SELECT → `invitation, user`

**`DELETE /api/invitations/:id`** — server/index.js:243 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L245 DELETE → `invitation`

**`POST /api/invitations/:id/renew`** — server/index.js:259 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L261 UPDATE → `invitation`

### /api/plants

**`GET /api/plants`** — server/index.js:998 _[requireAuth, requireHouse]_

- [OK] L1000 SELECT → `plants`

**`POST /api/plants`** — server/index.js:1011 _[requireAuth, requireHouse]_

- [OK] L1016 INSERT → `plants`

**`PATCH /api/plants/:id`** — server/index.js:1028 _[requireAuth, requireHouse]_

- [OK] L1035 UPDATE → `plants`

**`DELETE /api/plants/:id`** — server/index.js:1048 _[requireAuth, requireHouse]_

- [OK] L1051 DELETE → `plants`

**`POST /api/plants/:id/water`** — server/index.js:1063 _[requireAuth, requireHouse]_

- [OK] L1067 SELECT → `plants`
-      L1073 BEGIN
-      L1074 INSERT → `plant_watering_history`
- [OK] L1078 UPDATE → `plants`
-      L1082 COMMIT
-      L1092 ROLLBACK

**`GET /api/plants/:id/history`** — server/index.js:1100 _[requireAuth, requireHouse]_

- [OK] L1103 SELECT → `plant_watering_history, plants`

### /api/products

**`GET /api/products`** — server/index.js:684 _[requireAuth, requireHouse]_

- L700 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products`** — server/index.js:708 _[requireAuth, requireHouse]_

- [OK] L712 INSERT → `products`

**`PATCH /api/products/:id`** — server/index.js:724 _[requireAuth, requireHouse]_

- L740 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products/:id/purchase`** — server/index.js:749 _[requireAuth, requireHouse]_

- [OK] L752 UPDATE → `products`

**`DELETE /api/products/:id`** — server/index.js:766 _[requireAuth, requireHouse]_

- [OK] L769 DELETE → `products`

### /api/push

**`GET /api/push/vapid-key`** — server/index.js:1204

- _Sin queries directas._

**`POST /api/push/subscribe`** — server/index.js:1211 _[requireAuth, requireHouse]_

- [OK] L1218 INSERT → `push_subscriptions`

**`DELETE /api/push/subscribe`** — server/index.js:1236 _[requireAuth]_

- [!!] L1240 DELETE → `push_subscriptions`

**`GET /api/push/status`** — server/index.js:1248 _[requireAuth, requireHouse]_

- [OK] L1250 SELECT → `push_subscriptions`

### /api/shopping-categories

**`GET /api/shopping-categories`** — server/index.js:779 _[requireAuth, requireHouse]_

- [OK] L781 SELECT → `shopping_categories`

**`POST /api/shopping-categories`** — server/index.js:792 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L797 SELECT → `shopping_categories`
- [OK] L801 INSERT → `shopping_categories`

**`PATCH /api/shopping-categories/:id`** — server/index.js:812 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L822 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-categories/:id`** — server/index.js:831 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L834 DELETE → `shopping_categories`

### /api/shopping-items

**`GET /api/shopping-items`** — server/index.js:844 _[requireAuth, requireHouse]_

- [OK] L847 UPDATE → `shopping_items`
- [OK] L858 SELECT → `shopping_items, shopping_categories`

**`POST /api/shopping-items`** — server/index.js:872 _[requireAuth, requireHouse]_

- [OK] L876 INSERT → `shopping_items`

**`PATCH /api/shopping-items/:id`** — server/index.js:887 _[requireAuth, requireHouse]_

- L909 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-items/clear-purchased`** — server/index.js:919 _[requireAuth, requireHouse]_

- [OK] L922 UPDATE → `shopping_items`

**`GET /api/shopping-items/history`** — server/index.js:939 _[requireAuth, requireHouse]_

- [OK] L942 SELECT → `shopping_items, shopping_categories`

**`GET /api/shopping-items/recommendations`** — server/index.js:958 _[requireAuth, requireHouse]_

- [OK] L960 SELECT → `shopping_items, shopping_categories`
- [OK] L971 SELECT → `shopping_items`

**`DELETE /api/shopping-items/:id`** — server/index.js:985 _[requireAuth, requireHouse]_

- [OK] L988 DELETE → `shopping_items`

### /api/stats

**`GET /api/stats/participation`** — server/index.js:1118 _[requireAuth, requireHouse]_

- [OK] L1129 SELECT → `completions, tasks, house_member_profiles`
- [OK] L1149 SELECT → `completions, tasks`
- [OK] L1162 SELECT → `completions, tasks`

### /api/super-admin

**`GET /api/super-admin/check`** — server/index.js:88 _[requireAuth]_

-      L90 SELECT → `super_admins`

**`GET /api/super-admin/stats`** — server/index.js:101 _[requireAuth, requireSuperAdmin]_

-      L104 SELECT → `user`
-      L105 SELECT → `organization`
-      L106 SELECT → `member`
- [!!] L107 SELECT → `tasks`
-      L108 SELECT → `completions`
-      L109 SELECT → `completions`
- [OK] L116 SELECT → `organization, member, tasks, completions`

### /api/tasks

**`GET /api/tasks/pending`** — server/index.js:501 _[requireAuth, requireHouse]_

- [OK] L503 SELECT → `tasks, completions`

**`GET /api/tasks`** — server/index.js:527 _[requireAuth, requireHouse]_

- L533 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/tasks`** — server/index.js:541 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L544 INSERT → `tasks`

**`PATCH /api/tasks/:id`** — server/index.js:556 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L566 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/tasks/:id`** — server/index.js:575 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L578 SELECT → `tasks`
-      L585 DELETE → `completions`
- [OK] L586 DELETE → `tasks`

**`POST /api/tasks/:id/reset`** — server/index.js:651 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L654 UPDATE → `tasks`

### /api/uploads

**`POST /api/uploads`** — server/index.js:484 _[requireAuth, upload.single('image')]_

- _Sin queries directas._

**`DELETE /api/uploads/:filename`** — server/index.js:489 _[requireAuth]_

- _Sin queries directas._

## Helpers / factories con queries

**`sendPushToHouse`** — server/index.js:1261

- L1265 SELECT → `push_subscriptions` (filtra org)
- L1279 DELETE → `push_subscriptions`

**`migrate`** — server/index.js:1291

- L1294 CREATE (filtra org)
- L1309 CREATE
- L1318 CREATE
- L1319 CREATE
- L1321 CREATE (filtra org)
- L1333 CREATE
- L1334 CREATE
- L1336 CREATE (filtra org)
- L1346 CREATE (filtra org)
- L1348 CREATE (filtra org)
- L1360 CREATE
- L1361 CREATE
- L1383 CREATE (filtra org)
- L1384 CREATE (filtra org)
- L1385 CREATE (filtra org)
- L1389 CREATE
- L1397 CREATE
- L1398 CREATE
- L1401 CREATE (filtra org)
- L1415 CREATE
- L1424 CREATE (filtra org)
- L1435 CREATE (filtra org)
- L1437 CREATE
- L1446 CREATE
- L1447 CREATE
- L1450 CREATE (filtra org)
- L1462 CREATE (filtra org)
- L1463 CREATE

**`addColumnIfMissing`** — server/index.js:1471

- L1472 SELECT
- L1477 ALTER

**`requireHouse`** — server/lib/middleware.js:42

- L47 SELECT → `member` (filtra org)

**`requireSuperAdmin`** — server/lib/middleware.js:66

- L68 SELECT → `super_admins`

## Tablas → Endpoints

### `completions`

- **Columnas:** `id` UUID, `task_id` UUID, `completed_at` TIMESTAMPTZ, `completed_by` TEXT, `user_id` TEXT
- **FK:** `task_id` → `tasks.id`
- **Multi-tenant:** no
- **Lectores (9):**
    - `GET /api/super-admin/stats` (server/index.js:108, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:109, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
    - `GET /api/tasks/pending` (server/index.js:503, SELECT)
    - `GET /api/completions` (server/index.js:598, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:669, SELECT)
    - `GET /api/stats/participation` (server/index.js:1129, SELECT)
    - `GET /api/stats/participation` (server/index.js:1149, SELECT)
    - `GET /api/stats/participation` (server/index.js:1162, SELECT)
- **Escritores (2):**
    - `DELETE /api/tasks/:id` (server/index.js:585, DELETE) [sin filtro org]
    - `POST /api/completions` (server/index.js:621, INSERT) [sin filtro org]

### `house_member_profiles`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `avatar` TEXT, `color` TEXT, `home_screen` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (4):**
    - `GET /api/houses/members` (server/index.js:160, SELECT)
    - `GET /api/houses/profile` (server/index.js:182, SELECT)
    - `PUT /api/houses/profile` (server/index.js:204, SELECT)
    - `GET /api/stats/participation` (server/index.js:1129, SELECT)
- **Escritores (2):**
    - `PUT /api/houses/profile` (server/index.js:212, INSERT)
    - `DELETE /api/houses/:id` (server/index.js:302, DELETE)

### `invitation` _(externa — better-auth u otra fuente)_

- **Lectores (1):**
    - `GET /api/invitations` (server/index.js:228, SELECT)
- **Escritores (3):**
    - `DELETE /api/invitations/:id` (server/index.js:245, DELETE)
    - `POST /api/invitations/:id/renew` (server/index.js:261, UPDATE)
    - `DELETE /api/houses/:id` (server/index.js:310, DELETE)

### `member` _(externa — better-auth u otra fuente)_

- **Lectores (5):**
    - `GET /api/super-admin/stats` (server/index.js:106, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
    - `GET /api/houses/members` (server/index.js:160, SELECT)
    - `DELETE /api/houses/:id` (server/index.js:285, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:47, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:311, DELETE)

### `organization` _(externa — better-auth u otra fuente)_

- **Lectores (2):**
    - `GET /api/super-admin/stats` (server/index.js:105, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:312, DELETE) [sin filtro org]

### `plant_watering_history`

- **Columnas:** `id` UUID, `plant_id` UUID, `watered_at` TIMESTAMPTZ, `watered_by` TEXT, `user_id` TEXT
- **FK:** `plant_id` → `plants.id`
- **Multi-tenant:** no
- **Lectores (1):**
    - `GET /api/plants/:id/history` (server/index.js:1103, SELECT)
- **Escritores (2):**
    - `DELETE /api/houses/:id` (server/index.js:304, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1074, INSERT) [sin filtro org]

### `plants`

- **Columnas:** `id` UUID, `name` TEXT, `notes` TEXT, `watering_frequency_days` INTEGER, `last_watered_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (3):**
    - `GET /api/plants` (server/index.js:1000, SELECT)
    - `POST /api/plants/:id/water` (server/index.js:1067, SELECT)
    - `GET /api/plants/:id/history` (server/index.js:1103, SELECT)
- **Escritores (6):**
    - `DELETE /api/houses/:id` (server/index.js:304, DELETE)
    - `DELETE /api/houses/:id` (server/index.js:308, DELETE)
    - `POST /api/plants` (server/index.js:1016, INSERT)
    - `PATCH /api/plants/:id` (server/index.js:1035, UPDATE)
    - `DELETE /api/plants/:id` (server/index.js:1051, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1078, UPDATE)

### `products`

- **Columnas:** `id` UUID, `name` TEXT, `category` TEXT, `is_out_of_stock` BOOLEAN, `reminder_frequency_days` INTEGER, `units` INTEGER, `last_purchased_at` TIMESTAMPTZ, `last_out_of_stock_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:299, DELETE)
    - `POST /api/houses/seed` (server/index.js:460, INSERT)
    - `POST /api/products` (server/index.js:712, INSERT)
    - `POST /api/products/:id/purchase` (server/index.js:752, UPDATE)
    - `DELETE /api/products/:id` (server/index.js:769, DELETE)

### `push_subscriptions`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `endpoint` TEXT, `keys_p256dh` TEXT, `keys_auth` TEXT, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `GET /api/push/status` (server/index.js:1250, SELECT)
    - helper `sendPushToHouse` (server/index.js:1265, SELECT)
- **Escritores (4):**
    - `DELETE /api/houses/:id` (server/index.js:303, DELETE)
    - `POST /api/push/subscribe` (server/index.js:1218, INSERT)
    - `DELETE /api/push/subscribe` (server/index.js:1240, DELETE) [sin filtro org]
    - helper `sendPushToHouse` (server/index.js:1279, DELETE) [sin filtro org]

### `shopping_categories`

- **Columnas:** `id` UUID, `name` TEXT, `emoji` TEXT, `sort_order` INTEGER, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/shopping-categories` (server/index.js:781, SELECT)
    - `POST /api/shopping-categories` (server/index.js:797, SELECT)
    - `GET /api/shopping-items` (server/index.js:858, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:942, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:960, SELECT)
- **Escritores (3):**
    - `DELETE /api/houses/:id` (server/index.js:301, DELETE)
    - `POST /api/shopping-categories` (server/index.js:801, INSERT)
    - `DELETE /api/shopping-categories/:id` (server/index.js:834, DELETE)

### `shopping_items`

- **Columnas:** `id` UUID, `name` TEXT, `note` TEXT, `added_by` TEXT, `is_purchased` BOOLEAN, `category_id` UUID, `organization_id` TEXT, `purchased_at` TIMESTAMPTZ, `archived_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **FK:** `category_id` → `shopping_categories.id`
- **Multi-tenant:** si (organization_id)
- **Lectores (4):**
    - `GET /api/shopping-items` (server/index.js:858, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:942, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:960, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:971, SELECT)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:300, DELETE)
    - `GET /api/shopping-items` (server/index.js:847, UPDATE)
    - `POST /api/shopping-items` (server/index.js:876, INSERT)
    - `DELETE /api/shopping-items/clear-purchased` (server/index.js:922, UPDATE)
    - `DELETE /api/shopping-items/:id` (server/index.js:988, DELETE)

### `super_admins`

- **Columnas:** `id` UUID, `user_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** no
- **Lectores (2):**
    - `GET /api/super-admin/check` (server/index.js:90, SELECT) [sin filtro org]
    - helper `requireSuperAdmin` (server/lib/middleware.js:68, SELECT) [sin filtro org]

### `tasks`

- **Columnas:** `id` UUID, `name` TEXT, `description` TEXT, `frequency_type` TEXT, `frequency_value` INTEGER, `is_active` BOOLEAN, `product_name` TEXT, `product_image` TEXT, `organization_id` TEXT, `last_reset_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (11):**
    - `GET /api/super-admin/stats` (server/index.js:107, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
    - `POST /api/houses/seed` (server/index.js:332, SELECT)
    - `GET /api/tasks/pending` (server/index.js:503, SELECT)
    - `DELETE /api/tasks/:id` (server/index.js:578, SELECT)
    - `GET /api/completions` (server/index.js:598, SELECT)
    - `POST /api/completions` (server/index.js:616, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:669, SELECT)
    - `GET /api/stats/participation` (server/index.js:1129, SELECT)
    - `GET /api/stats/participation` (server/index.js:1149, SELECT)
    - `GET /api/stats/participation` (server/index.js:1162, SELECT)
- **Escritores (7):**
    - `DELETE /api/houses/:id` (server/index.js:298, DELETE)
    - `POST /api/houses/seed` (server/index.js:368, INSERT)
    - `POST /api/houses/seed` (server/index.js:404, INSERT)
    - `POST /api/tasks` (server/index.js:544, INSERT)
    - `DELETE /api/tasks/:id` (server/index.js:586, DELETE)
    - `POST /api/completions` (server/index.js:628, UPDATE)
    - `POST /api/tasks/:id/reset` (server/index.js:654, UPDATE)

### `user` _(externa — better-auth u otra fuente)_

- **Lectores (3):**
    - `GET /api/super-admin/stats` (server/index.js:104, SELECT) [sin filtro org]
    - `GET /api/houses/members` (server/index.js:160, SELECT)
    - `GET /api/invitations` (server/index.js:228, SELECT)

