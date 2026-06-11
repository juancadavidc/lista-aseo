# Code Graph — Casa Limpia

_Generado automaticamente por `scripts/codegraph.js` el 2026-06-11T00:15:06.321Z._

**No editar a mano.** Regenerar con `npm run codegraph` despues de cambios en `server/` o `db/init.sql`.

## Resumen

| Metrica | Valor |
|---|---|
| Rutas registradas | 53 |
| Queries en rutas (estaticas) | 84 |
| Queries dinamicas (SQL en variable) | 6 |
| Queries con filtro `organization_id` | 64 |
| Helpers con queries | 5 |
| Tablas en schema | 11 |
| Tablas referenciadas (incl. externas) | 15 |

## Queries sin filtro multi-tenant (revisar)

Queries que tocan tablas con `organization_id` pero no lo filtran:

- `GET /api/super-admin/stats` (server/index.js:107) — SELECT `tasks`
- `DELETE /api/push/subscribe` (server/index.js:1337) — DELETE `push_subscriptions`

## API → Handler → SQL

### /api/auth

**`ALL /api/auth/*`** — server/index.js:79

- _Sin queries directas._

### /api/completions

**`GET /api/completions`** — server/index.js:627 _[requireAuth, requireHouse]_

- [OK] L629 SELECT → `completions, tasks`

**`POST /api/completions`** — server/index.js:643 _[requireAuth, requireHouse]_

- [OK] L647 SELECT → `tasks`
- [OK] L656 SELECT → `visits`
-      L673 INSERT → `completions`
- [OK] L680 UPDATE → `tasks`

**`GET /api/completions/:taskId/history`** — server/index.js:763 _[requireAuth, requireHouse]_

- [OK] L766 SELECT → `completions, tasks`

### /api/health

**`GET /api/health`** — server/index.js:504

-      L506 SELECT

### /api/houses

**`GET /api/houses/members`** — server/index.js:158 _[requireAuth, requireHouse]_

- [OK] L160 SELECT → `member, user, house_member_profiles`

**`PATCH /api/houses/members/:userId/type`** — server/index.js:181 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L188 SELECT → `member`
- [OK] L195 INSERT → `house_member_profiles`

**`GET /api/houses/profile`** — server/index.js:210 _[requireAuth, requireHouse]_

- [OK] L212 SELECT → `house_member_profiles`

**`PUT /api/houses/profile`** — server/index.js:229 _[requireAuth, requireHouse]_

- [OK] L235 SELECT → `house_member_profiles`
- [OK] L243 INSERT → `house_member_profiles`

**`DELETE /api/houses/:id`** — server/index.js:309 _[requireAuth]_

-      L316 SELECT → `member`
-      L327 BEGIN
- [OK] L329 DELETE → `tasks`
- [OK] L330 DELETE → `products`
- [OK] L331 DELETE → `shopping_items`
- [OK] L332 DELETE → `shopping_categories`
- [OK] L333 DELETE → `house_member_profiles`
- [OK] L334 DELETE → `push_subscriptions`
- [OK] L335 DELETE → `plant_watering_history, plants`
- [OK] L339 DELETE → `plants`
-      L341 DELETE → `invitation`
-      L342 DELETE → `member`
-      L343 DELETE → `organization`
-      L344 COMMIT
-      L348 ROLLBACK

**`POST /api/houses/seed`** — server/index.js:356 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L363 SELECT → `tasks`
- [OK] L399 INSERT → `tasks`
- [OK] L435 INSERT → `tasks`
- [OK] L491 INSERT → `products`

### /api/invitations

**`GET /api/invitations`** — server/index.js:257 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L259 SELECT → `invitation, user`

**`DELETE /api/invitations/:id`** — server/index.js:274 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L276 DELETE → `invitation`

**`POST /api/invitations/:id/renew`** — server/index.js:290 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L292 UPDATE → `invitation`

### /api/plants

**`GET /api/plants`** — server/index.js:1095 _[requireAuth, requireHouse]_

- [OK] L1097 SELECT → `plants`

**`POST /api/plants`** — server/index.js:1108 _[requireAuth, requireHouse]_

- [OK] L1113 INSERT → `plants`

**`PATCH /api/plants/:id`** — server/index.js:1125 _[requireAuth, requireHouse]_

- [OK] L1132 UPDATE → `plants`

**`DELETE /api/plants/:id`** — server/index.js:1145 _[requireAuth, requireHouse]_

- [OK] L1148 DELETE → `plants`

**`POST /api/plants/:id/water`** — server/index.js:1160 _[requireAuth, requireHouse]_

- [OK] L1164 SELECT → `plants`
-      L1170 BEGIN
-      L1171 INSERT → `plant_watering_history`
- [OK] L1175 UPDATE → `plants`
-      L1179 COMMIT
-      L1189 ROLLBACK

**`GET /api/plants/:id/history`** — server/index.js:1197 _[requireAuth, requireHouse]_

- [OK] L1200 SELECT → `plant_watering_history, plants`

### /api/products

**`GET /api/products`** — server/index.js:781 _[requireAuth, requireHouse]_

- L797 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products`** — server/index.js:805 _[requireAuth, requireHouse]_

- [OK] L809 INSERT → `products`

**`PATCH /api/products/:id`** — server/index.js:821 _[requireAuth, requireHouse]_

- L837 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products/:id/purchase`** — server/index.js:846 _[requireAuth, requireHouse]_

- [OK] L849 UPDATE → `products`

**`DELETE /api/products/:id`** — server/index.js:863 _[requireAuth, requireHouse]_

- [OK] L866 DELETE → `products`

### /api/push

**`GET /api/push/vapid-key`** — server/index.js:1301

- _Sin queries directas._

**`POST /api/push/subscribe`** — server/index.js:1308 _[requireAuth, requireHouse]_

- [OK] L1315 INSERT → `push_subscriptions`

**`DELETE /api/push/subscribe`** — server/index.js:1333 _[requireAuth]_

- [!!] L1337 DELETE → `push_subscriptions`

**`GET /api/push/status`** — server/index.js:1345 _[requireAuth, requireHouse]_

- [OK] L1347 SELECT → `push_subscriptions`

### /api/shopping-categories

**`GET /api/shopping-categories`** — server/index.js:876 _[requireAuth, requireHouse]_

- [OK] L878 SELECT → `shopping_categories`

**`POST /api/shopping-categories`** — server/index.js:889 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L894 SELECT → `shopping_categories`
- [OK] L898 INSERT → `shopping_categories`

**`PATCH /api/shopping-categories/:id`** — server/index.js:909 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L919 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-categories/:id`** — server/index.js:928 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L931 DELETE → `shopping_categories`

### /api/shopping-items

**`GET /api/shopping-items`** — server/index.js:941 _[requireAuth, requireHouse]_

- [OK] L944 UPDATE → `shopping_items`
- [OK] L955 SELECT → `shopping_items, shopping_categories`

**`POST /api/shopping-items`** — server/index.js:969 _[requireAuth, requireHouse]_

- [OK] L973 INSERT → `shopping_items`

**`PATCH /api/shopping-items/:id`** — server/index.js:984 _[requireAuth, requireHouse]_

- L1006 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-items/clear-purchased`** — server/index.js:1016 _[requireAuth, requireHouse]_

- [OK] L1019 UPDATE → `shopping_items`

**`GET /api/shopping-items/history`** — server/index.js:1036 _[requireAuth, requireHouse]_

- [OK] L1039 SELECT → `shopping_items, shopping_categories`

**`GET /api/shopping-items/recommendations`** — server/index.js:1055 _[requireAuth, requireHouse]_

- [OK] L1057 SELECT → `shopping_items, shopping_categories`
- [OK] L1068 SELECT → `shopping_items`

**`DELETE /api/shopping-items/:id`** — server/index.js:1082 _[requireAuth, requireHouse]_

- [OK] L1085 DELETE → `shopping_items`

### /api/stats

**`GET /api/stats/participation`** — server/index.js:1215 _[requireAuth, requireHouse]_

- [OK] L1226 SELECT → `completions, tasks, house_member_profiles`
- [OK] L1246 SELECT → `completions, tasks`
- [OK] L1259 SELECT → `completions, tasks`

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

**`GET /api/tasks/pending`** — server/index.js:532 _[requireAuth, requireHouse]_

- [OK] L534 SELECT → `tasks, completions`

**`GET /api/tasks`** — server/index.js:558 _[requireAuth, requireHouse]_

- L564 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/tasks`** — server/index.js:572 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L575 INSERT → `tasks`

**`PATCH /api/tasks/:id`** — server/index.js:587 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L597 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/tasks/:id`** — server/index.js:606 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L609 SELECT → `tasks`
-      L616 DELETE → `completions`
- [OK] L617 DELETE → `tasks`

**`POST /api/tasks/:id/reset`** — server/index.js:748 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L751 UPDATE → `tasks`

### /api/uploads

**`POST /api/uploads`** — server/index.js:515 _[requireAuth, upload.single('image')]_

- _Sin queries directas._

**`DELETE /api/uploads/:filename`** — server/index.js:520 _[requireAuth]_

- _Sin queries directas._

### /api/visits

**`GET /api/visits/active`** — server/index.js:706 _[requireAuth, requireHouse]_

- [OK] L708 SELECT → `visits`

**`POST /api/visits`** — server/index.js:722 _[requireAuth, requireHouse]_

-      L731 SELECT
- [OK] L735 INSERT → `visits`

## Helpers / factories con queries

**`sendPushToHouse`** — server/index.js:1358

- L1362 SELECT → `push_subscriptions` (filtra org)
- L1376 DELETE → `push_subscriptions`

**`migrate`** — server/index.js:1388

- L1391 CREATE (filtra org)
- L1406 CREATE
- L1415 CREATE
- L1416 CREATE
- L1418 CREATE (filtra org)
- L1430 CREATE
- L1431 CREATE
- L1433 CREATE (filtra org)
- L1443 CREATE (filtra org)
- L1445 CREATE (filtra org)
- L1457 CREATE
- L1458 CREATE
- L1480 CREATE (filtra org)
- L1481 CREATE (filtra org)
- L1482 CREATE (filtra org)
- L1486 CREATE
- L1497 CREATE
- L1498 CREATE
- L1501 CREATE (filtra org)
- L1515 CREATE (filtra org)
- L1524 CREATE (filtra org)
- L1527 CREATE
- L1536 CREATE (filtra org)
- L1547 CREATE (filtra org)
- L1549 CREATE
- L1558 CREATE
- L1559 CREATE
- L1562 CREATE (filtra org)
- L1574 CREATE (filtra org)
- L1575 CREATE

**`addColumnIfMissing`** — server/index.js:1583

- L1584 SELECT
- L1589 ALTER

**`requireHouse`** — server/lib/middleware.js:42

- L47 SELECT → `member, house_member_profiles` (filtra org)

**`requireSuperAdmin`** — server/lib/middleware.js:70

- L72 SELECT → `super_admins`

## Tablas → Endpoints

### `completions`

- **Columnas:** `id` UUID, `task_id` UUID, `completed_at` TIMESTAMPTZ, `completed_by` TEXT, `user_id` TEXT
- **FK:** `task_id` → `tasks.id`
- **Multi-tenant:** no
- **Lectores (9):**
    - `GET /api/super-admin/stats` (server/index.js:108, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:109, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
    - `GET /api/tasks/pending` (server/index.js:534, SELECT)
    - `GET /api/completions` (server/index.js:629, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:766, SELECT)
    - `GET /api/stats/participation` (server/index.js:1226, SELECT)
    - `GET /api/stats/participation` (server/index.js:1246, SELECT)
    - `GET /api/stats/participation` (server/index.js:1259, SELECT)
- **Escritores (2):**
    - `DELETE /api/tasks/:id` (server/index.js:616, DELETE) [sin filtro org]
    - `POST /api/completions` (server/index.js:673, INSERT) [sin filtro org]

### `house_member_profiles`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `avatar` TEXT, `color` TEXT, `home_screen` TEXT, `member_type` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/houses/members` (server/index.js:160, SELECT)
    - `GET /api/houses/profile` (server/index.js:212, SELECT)
    - `PUT /api/houses/profile` (server/index.js:235, SELECT)
    - `GET /api/stats/participation` (server/index.js:1226, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:47, SELECT)
- **Escritores (3):**
    - `PATCH /api/houses/members/:userId/type` (server/index.js:195, INSERT)
    - `PUT /api/houses/profile` (server/index.js:243, INSERT)
    - `DELETE /api/houses/:id` (server/index.js:333, DELETE)

### `invitation` _(externa — better-auth u otra fuente)_

- **Lectores (1):**
    - `GET /api/invitations` (server/index.js:259, SELECT)
- **Escritores (3):**
    - `DELETE /api/invitations/:id` (server/index.js:276, DELETE)
    - `POST /api/invitations/:id/renew` (server/index.js:292, UPDATE)
    - `DELETE /api/houses/:id` (server/index.js:341, DELETE)

### `member` _(externa — better-auth u otra fuente)_

- **Lectores (6):**
    - `GET /api/super-admin/stats` (server/index.js:106, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
    - `GET /api/houses/members` (server/index.js:160, SELECT)
    - `PATCH /api/houses/members/:userId/type` (server/index.js:188, SELECT)
    - `DELETE /api/houses/:id` (server/index.js:316, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:47, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:342, DELETE)

### `organization` _(externa — better-auth u otra fuente)_

- **Lectores (2):**
    - `GET /api/super-admin/stats` (server/index.js:105, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:343, DELETE) [sin filtro org]

### `plant_watering_history`

- **Columnas:** `id` UUID, `plant_id` UUID, `watered_at` TIMESTAMPTZ, `watered_by` TEXT, `user_id` TEXT
- **FK:** `plant_id` → `plants.id`
- **Multi-tenant:** no
- **Lectores (1):**
    - `GET /api/plants/:id/history` (server/index.js:1200, SELECT)
- **Escritores (2):**
    - `DELETE /api/houses/:id` (server/index.js:335, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1171, INSERT) [sin filtro org]

### `plants`

- **Columnas:** `id` UUID, `name` TEXT, `notes` TEXT, `watering_frequency_days` INTEGER, `last_watered_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (3):**
    - `GET /api/plants` (server/index.js:1097, SELECT)
    - `POST /api/plants/:id/water` (server/index.js:1164, SELECT)
    - `GET /api/plants/:id/history` (server/index.js:1200, SELECT)
- **Escritores (6):**
    - `DELETE /api/houses/:id` (server/index.js:335, DELETE)
    - `DELETE /api/houses/:id` (server/index.js:339, DELETE)
    - `POST /api/plants` (server/index.js:1113, INSERT)
    - `PATCH /api/plants/:id` (server/index.js:1132, UPDATE)
    - `DELETE /api/plants/:id` (server/index.js:1148, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1175, UPDATE)

### `products`

- **Columnas:** `id` UUID, `name` TEXT, `category` TEXT, `is_out_of_stock` BOOLEAN, `reminder_frequency_days` INTEGER, `units` INTEGER, `last_purchased_at` TIMESTAMPTZ, `last_out_of_stock_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:330, DELETE)
    - `POST /api/houses/seed` (server/index.js:491, INSERT)
    - `POST /api/products` (server/index.js:809, INSERT)
    - `POST /api/products/:id/purchase` (server/index.js:849, UPDATE)
    - `DELETE /api/products/:id` (server/index.js:866, DELETE)

### `push_subscriptions`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `endpoint` TEXT, `keys_p256dh` TEXT, `keys_auth` TEXT, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `GET /api/push/status` (server/index.js:1347, SELECT)
    - helper `sendPushToHouse` (server/index.js:1362, SELECT)
- **Escritores (4):**
    - `DELETE /api/houses/:id` (server/index.js:334, DELETE)
    - `POST /api/push/subscribe` (server/index.js:1315, INSERT)
    - `DELETE /api/push/subscribe` (server/index.js:1337, DELETE) [sin filtro org]
    - helper `sendPushToHouse` (server/index.js:1376, DELETE) [sin filtro org]

### `shopping_categories`

- **Columnas:** `id` UUID, `name` TEXT, `emoji` TEXT, `sort_order` INTEGER, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/shopping-categories` (server/index.js:878, SELECT)
    - `POST /api/shopping-categories` (server/index.js:894, SELECT)
    - `GET /api/shopping-items` (server/index.js:955, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:1039, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1057, SELECT)
- **Escritores (3):**
    - `DELETE /api/houses/:id` (server/index.js:332, DELETE)
    - `POST /api/shopping-categories` (server/index.js:898, INSERT)
    - `DELETE /api/shopping-categories/:id` (server/index.js:931, DELETE)

### `shopping_items`

- **Columnas:** `id` UUID, `name` TEXT, `note` TEXT, `added_by` TEXT, `is_purchased` BOOLEAN, `category_id` UUID, `organization_id` TEXT, `purchased_at` TIMESTAMPTZ, `archived_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **FK:** `category_id` → `shopping_categories.id`
- **Multi-tenant:** si (organization_id)
- **Lectores (4):**
    - `GET /api/shopping-items` (server/index.js:955, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:1039, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1057, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1068, SELECT)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:331, DELETE)
    - `GET /api/shopping-items` (server/index.js:944, UPDATE)
    - `POST /api/shopping-items` (server/index.js:973, INSERT)
    - `DELETE /api/shopping-items/clear-purchased` (server/index.js:1019, UPDATE)
    - `DELETE /api/shopping-items/:id` (server/index.js:1085, DELETE)

### `super_admins`

- **Columnas:** `id` UUID, `user_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** no
- **Lectores (2):**
    - `GET /api/super-admin/check` (server/index.js:90, SELECT) [sin filtro org]
    - helper `requireSuperAdmin` (server/lib/middleware.js:72, SELECT) [sin filtro org]

### `tasks`

- **Columnas:** `id` UUID, `name` TEXT, `description` TEXT, `frequency_type` TEXT, `frequency_value` INTEGER, `is_active` BOOLEAN, `product_name` TEXT, `product_image` TEXT, `organization_id` TEXT, `last_reset_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (11):**
    - `GET /api/super-admin/stats` (server/index.js:107, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:116, SELECT)
    - `POST /api/houses/seed` (server/index.js:363, SELECT)
    - `GET /api/tasks/pending` (server/index.js:534, SELECT)
    - `DELETE /api/tasks/:id` (server/index.js:609, SELECT)
    - `GET /api/completions` (server/index.js:629, SELECT)
    - `POST /api/completions` (server/index.js:647, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:766, SELECT)
    - `GET /api/stats/participation` (server/index.js:1226, SELECT)
    - `GET /api/stats/participation` (server/index.js:1246, SELECT)
    - `GET /api/stats/participation` (server/index.js:1259, SELECT)
- **Escritores (7):**
    - `DELETE /api/houses/:id` (server/index.js:329, DELETE)
    - `POST /api/houses/seed` (server/index.js:399, INSERT)
    - `POST /api/houses/seed` (server/index.js:435, INSERT)
    - `POST /api/tasks` (server/index.js:575, INSERT)
    - `DELETE /api/tasks/:id` (server/index.js:617, DELETE)
    - `POST /api/completions` (server/index.js:680, UPDATE)
    - `POST /api/tasks/:id/reset` (server/index.js:751, UPDATE)

### `user` _(externa — better-auth u otra fuente)_

- **Lectores (3):**
    - `GET /api/super-admin/stats` (server/index.js:104, SELECT) [sin filtro org]
    - `GET /api/houses/members` (server/index.js:160, SELECT)
    - `GET /api/invitations` (server/index.js:259, SELECT)

### `visits`

- **Columnas:** `id` UUID, `organization_id` TEXT, `user_id` TEXT, `visited_on` DATE, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `POST /api/completions` (server/index.js:656, SELECT)
    - `GET /api/visits/active` (server/index.js:708, SELECT)
- **Escritores (1):**
    - `POST /api/visits` (server/index.js:735, INSERT)

