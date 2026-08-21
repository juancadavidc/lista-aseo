# Code Graph — Casa Limpia

_Generado automaticamente por `scripts/codegraph.js` el 2026-08-21T03:18:44.231Z._

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

- `GET /api/super-admin/stats` (server/index.js:108) — SELECT `tasks`
- `DELETE /api/push/subscribe` (server/index.js:1339) — DELETE `push_subscriptions`

## API → Handler → SQL

### /api/auth

**`ALL /api/auth/*`** — server/index.js:80

- _Sin queries directas._

### /api/completions

**`GET /api/completions`** — server/index.js:629 _[requireAuth, requireHouse]_

- [OK] L631 SELECT → `completions, tasks`

**`POST /api/completions`** — server/index.js:645 _[requireAuth, requireHouse]_

- [OK] L649 SELECT → `tasks`
- [OK] L658 SELECT → `visits`
-      L675 INSERT → `completions`
- [OK] L682 UPDATE → `tasks`

**`GET /api/completions/:taskId/history`** — server/index.js:765 _[requireAuth, requireHouse]_

- [OK] L768 SELECT → `completions, tasks`

### /api/health

**`GET /api/health`** — server/index.js:505

-      L507 SELECT

### /api/houses

**`GET /api/houses/members`** — server/index.js:159 _[requireAuth, requireHouse]_

- [OK] L161 SELECT → `member, user, house_member_profiles`

**`PATCH /api/houses/members/:userId/type`** — server/index.js:182 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L189 SELECT → `member`
- [OK] L196 INSERT → `house_member_profiles`

**`GET /api/houses/profile`** — server/index.js:211 _[requireAuth, requireHouse]_

- [OK] L213 SELECT → `house_member_profiles`

**`PUT /api/houses/profile`** — server/index.js:230 _[requireAuth, requireHouse]_

- [OK] L236 SELECT → `house_member_profiles`
- [OK] L244 INSERT → `house_member_profiles`

**`DELETE /api/houses/:id`** — server/index.js:310 _[requireAuth]_

-      L317 SELECT → `member`
-      L328 BEGIN
- [OK] L330 DELETE → `tasks`
- [OK] L331 DELETE → `products`
- [OK] L332 DELETE → `shopping_items`
- [OK] L333 DELETE → `shopping_categories`
- [OK] L334 DELETE → `house_member_profiles`
- [OK] L335 DELETE → `push_subscriptions`
- [OK] L336 DELETE → `plant_watering_history, plants`
- [OK] L340 DELETE → `plants`
-      L342 DELETE → `invitation`
-      L343 DELETE → `member`
-      L344 DELETE → `organization`
-      L345 COMMIT
-      L349 ROLLBACK

**`POST /api/houses/seed`** — server/index.js:357 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L364 SELECT → `tasks`
- [OK] L400 INSERT → `tasks`
- [OK] L436 INSERT → `tasks`
- [OK] L492 INSERT → `products`

### /api/invitations

**`GET /api/invitations`** — server/index.js:258 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L260 SELECT → `invitation, user`

**`DELETE /api/invitations/:id`** — server/index.js:275 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L277 DELETE → `invitation`

**`POST /api/invitations/:id/renew`** — server/index.js:291 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

-      L293 UPDATE → `invitation`

### /api/plants

**`GET /api/plants`** — server/index.js:1097 _[requireAuth, requireHouse]_

- [OK] L1099 SELECT → `plants`

**`POST /api/plants`** — server/index.js:1110 _[requireAuth, requireHouse]_

- [OK] L1115 INSERT → `plants`

**`PATCH /api/plants/:id`** — server/index.js:1127 _[requireAuth, requireHouse]_

- [OK] L1134 UPDATE → `plants`

**`DELETE /api/plants/:id`** — server/index.js:1147 _[requireAuth, requireHouse]_

- [OK] L1150 DELETE → `plants`

**`POST /api/plants/:id/water`** — server/index.js:1162 _[requireAuth, requireHouse]_

- [OK] L1166 SELECT → `plants`
-      L1172 BEGIN
-      L1173 INSERT → `plant_watering_history`
- [OK] L1177 UPDATE → `plants`
-      L1181 COMMIT
-      L1191 ROLLBACK

**`GET /api/plants/:id/history`** — server/index.js:1199 _[requireAuth, requireHouse]_

- [OK] L1202 SELECT → `plant_watering_history, plants`

### /api/products

**`GET /api/products`** — server/index.js:783 _[requireAuth, requireHouse]_

- L799 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products`** — server/index.js:807 _[requireAuth, requireHouse]_

- [OK] L811 INSERT → `products`

**`PATCH /api/products/:id`** — server/index.js:823 _[requireAuth, requireHouse]_

- L839 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/products/:id/purchase`** — server/index.js:848 _[requireAuth, requireHouse]_

- [OK] L851 UPDATE → `products`

**`DELETE /api/products/:id`** — server/index.js:865 _[requireAuth, requireHouse]_

- [OK] L868 DELETE → `products`

### /api/push

**`GET /api/push/vapid-key`** — server/index.js:1303

- _Sin queries directas._

**`POST /api/push/subscribe`** — server/index.js:1310 _[requireAuth, requireHouse]_

- [OK] L1317 INSERT → `push_subscriptions`

**`DELETE /api/push/subscribe`** — server/index.js:1335 _[requireAuth]_

- [!!] L1339 DELETE → `push_subscriptions`

**`GET /api/push/status`** — server/index.js:1347 _[requireAuth, requireHouse]_

- [OK] L1349 SELECT → `push_subscriptions`

### /api/shopping-categories

**`GET /api/shopping-categories`** — server/index.js:878 _[requireAuth, requireHouse]_

- [OK] L880 SELECT → `shopping_categories`

**`POST /api/shopping-categories`** — server/index.js:891 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L896 SELECT → `shopping_categories`
- [OK] L900 INSERT → `shopping_categories`

**`PATCH /api/shopping-categories/:id`** — server/index.js:911 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L921 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-categories/:id`** — server/index.js:930 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L933 DELETE → `shopping_categories`

### /api/shopping-items

**`GET /api/shopping-items`** — server/index.js:943 _[requireAuth, requireHouse]_

- [OK] L946 UPDATE → `shopping_items`
- [OK] L957 SELECT → `shopping_items, shopping_categories`

**`POST /api/shopping-items`** — server/index.js:971 _[requireAuth, requireHouse]_

- [OK] L975 INSERT → `shopping_items`

**`PATCH /api/shopping-items/:id`** — server/index.js:986 _[requireAuth, requireHouse]_

- L1008 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/shopping-items/clear-purchased`** — server/index.js:1018 _[requireAuth, requireHouse]_

- [OK] L1021 UPDATE → `shopping_items`

**`GET /api/shopping-items/history`** — server/index.js:1038 _[requireAuth, requireHouse]_

- [OK] L1041 SELECT → `shopping_items, shopping_categories`

**`GET /api/shopping-items/recommendations`** — server/index.js:1057 _[requireAuth, requireHouse]_

- [OK] L1059 SELECT → `shopping_items, shopping_categories`
- [OK] L1070 SELECT → `shopping_items`

**`DELETE /api/shopping-items/:id`** — server/index.js:1084 _[requireAuth, requireHouse]_

- [OK] L1087 DELETE → `shopping_items`

### /api/stats

**`GET /api/stats/participation`** — server/index.js:1217 _[requireAuth, requireHouse]_

- [OK] L1228 SELECT → `completions, tasks, house_member_profiles`
- [OK] L1248 SELECT → `completions, tasks`
- [OK] L1261 SELECT → `completions, tasks`

### /api/super-admin

**`GET /api/super-admin/check`** — server/index.js:89 _[requireAuth]_

-      L91 SELECT → `super_admins`

**`GET /api/super-admin/stats`** — server/index.js:102 _[requireAuth, requireSuperAdmin]_

-      L105 SELECT → `user`
-      L106 SELECT → `organization`
-      L107 SELECT → `member`
- [!!] L108 SELECT → `tasks`
-      L109 SELECT → `completions`
-      L110 SELECT → `completions`
- [OK] L117 SELECT → `organization, member, tasks, completions`

### /api/tasks

**`GET /api/tasks/pending`** — server/index.js:533 _[requireAuth, requireHouse]_

- [OK] L535 SELECT → `tasks, completions`

**`GET /api/tasks`** — server/index.js:559 _[requireAuth, requireHouse]_

- L565 _dynamic SQL (`pool.query(variable)`)_

**`POST /api/tasks`** — server/index.js:574 _[requireAuth, requireHouse, denyExternalMembers]_

- [OK] L577 INSERT → `tasks`

**`PATCH /api/tasks/:id`** — server/index.js:589 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- L599 _dynamic SQL (`pool.query(variable)`)_

**`DELETE /api/tasks/:id`** — server/index.js:608 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L611 SELECT → `tasks`
-      L618 DELETE → `completions`
- [OK] L619 DELETE → `tasks`

**`POST /api/tasks/:id/reset`** — server/index.js:750 _[requireAuth, requireHouse, requireRole('owner', 'admin')]_

- [OK] L753 UPDATE → `tasks`

### /api/uploads

**`POST /api/uploads`** — server/index.js:516 _[requireAuth, upload.single('image')]_

- _Sin queries directas._

**`DELETE /api/uploads/:filename`** — server/index.js:521 _[requireAuth]_

- _Sin queries directas._

### /api/visits

**`GET /api/visits/active`** — server/index.js:708 _[requireAuth, requireHouse]_

- [OK] L710 SELECT → `visits`

**`POST /api/visits`** — server/index.js:724 _[requireAuth, requireHouse]_

-      L733 SELECT
- [OK] L737 INSERT → `visits`

## Helpers / factories con queries

**`sendPushToHouse`** — server/index.js:1360

- L1364 SELECT → `push_subscriptions` (filtra org)
- L1378 DELETE → `push_subscriptions`

**`migrate`** — server/index.js:1390

- L1393 CREATE (filtra org)
- L1408 CREATE
- L1417 CREATE
- L1418 CREATE
- L1420 CREATE (filtra org)
- L1432 CREATE
- L1433 CREATE
- L1435 CREATE (filtra org)
- L1445 CREATE (filtra org)
- L1447 CREATE (filtra org)
- L1459 CREATE
- L1460 CREATE
- L1482 CREATE (filtra org)
- L1483 CREATE (filtra org)
- L1484 CREATE (filtra org)
- L1488 CREATE
- L1499 CREATE
- L1500 CREATE
- L1503 CREATE (filtra org)
- L1517 CREATE (filtra org)
- L1526 CREATE (filtra org)
- L1529 CREATE
- L1538 CREATE (filtra org)
- L1549 CREATE (filtra org)
- L1551 CREATE
- L1560 CREATE
- L1561 CREATE
- L1564 CREATE (filtra org)
- L1576 CREATE (filtra org)
- L1577 CREATE

**`addColumnIfMissing`** — server/index.js:1585

- L1586 SELECT
- L1591 ALTER

**`requireHouse`** — server/lib/middleware.js:54

- L59 SELECT → `member, house_member_profiles` (filtra org)

**`requireSuperAdmin`** — server/lib/middleware.js:82

- L84 SELECT → `super_admins`

## Tablas → Endpoints

### `completions`

- **Columnas:** `id` UUID, `task_id` UUID, `completed_at` TIMESTAMPTZ, `completed_by` TEXT, `user_id` TEXT
- **FK:** `task_id` → `tasks.id`
- **Multi-tenant:** no
- **Lectores (9):**
    - `GET /api/super-admin/stats` (server/index.js:109, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:110, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:117, SELECT)
    - `GET /api/tasks/pending` (server/index.js:535, SELECT)
    - `GET /api/completions` (server/index.js:631, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:768, SELECT)
    - `GET /api/stats/participation` (server/index.js:1228, SELECT)
    - `GET /api/stats/participation` (server/index.js:1248, SELECT)
    - `GET /api/stats/participation` (server/index.js:1261, SELECT)
- **Escritores (2):**
    - `DELETE /api/tasks/:id` (server/index.js:618, DELETE) [sin filtro org]
    - `POST /api/completions` (server/index.js:675, INSERT) [sin filtro org]

### `house_member_profiles`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `avatar` TEXT, `color` TEXT, `home_screen` TEXT, `member_type` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/houses/members` (server/index.js:161, SELECT)
    - `GET /api/houses/profile` (server/index.js:213, SELECT)
    - `PUT /api/houses/profile` (server/index.js:236, SELECT)
    - `GET /api/stats/participation` (server/index.js:1228, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:59, SELECT)
- **Escritores (3):**
    - `PATCH /api/houses/members/:userId/type` (server/index.js:196, INSERT)
    - `PUT /api/houses/profile` (server/index.js:244, INSERT)
    - `DELETE /api/houses/:id` (server/index.js:334, DELETE)

### `invitation` _(externa — better-auth u otra fuente)_

- **Lectores (1):**
    - `GET /api/invitations` (server/index.js:260, SELECT)
- **Escritores (3):**
    - `DELETE /api/invitations/:id` (server/index.js:277, DELETE)
    - `POST /api/invitations/:id/renew` (server/index.js:293, UPDATE)
    - `DELETE /api/houses/:id` (server/index.js:342, DELETE)

### `member` _(externa — better-auth u otra fuente)_

- **Lectores (6):**
    - `GET /api/super-admin/stats` (server/index.js:107, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:117, SELECT)
    - `GET /api/houses/members` (server/index.js:161, SELECT)
    - `PATCH /api/houses/members/:userId/type` (server/index.js:189, SELECT)
    - `DELETE /api/houses/:id` (server/index.js:317, SELECT)
    - helper `requireHouse` (server/lib/middleware.js:59, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:343, DELETE)

### `organization` _(externa — better-auth u otra fuente)_

- **Lectores (2):**
    - `GET /api/super-admin/stats` (server/index.js:106, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:117, SELECT)
- **Escritores (1):**
    - `DELETE /api/houses/:id` (server/index.js:344, DELETE) [sin filtro org]

### `plant_watering_history`

- **Columnas:** `id` UUID, `plant_id` UUID, `watered_at` TIMESTAMPTZ, `watered_by` TEXT, `user_id` TEXT
- **FK:** `plant_id` → `plants.id`
- **Multi-tenant:** no
- **Lectores (1):**
    - `GET /api/plants/:id/history` (server/index.js:1202, SELECT)
- **Escritores (2):**
    - `DELETE /api/houses/:id` (server/index.js:336, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1173, INSERT) [sin filtro org]

### `plants`

- **Columnas:** `id` UUID, `name` TEXT, `notes` TEXT, `watering_frequency_days` INTEGER, `last_watered_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (3):**
    - `GET /api/plants` (server/index.js:1099, SELECT)
    - `POST /api/plants/:id/water` (server/index.js:1166, SELECT)
    - `GET /api/plants/:id/history` (server/index.js:1202, SELECT)
- **Escritores (6):**
    - `DELETE /api/houses/:id` (server/index.js:336, DELETE)
    - `DELETE /api/houses/:id` (server/index.js:340, DELETE)
    - `POST /api/plants` (server/index.js:1115, INSERT)
    - `PATCH /api/plants/:id` (server/index.js:1134, UPDATE)
    - `DELETE /api/plants/:id` (server/index.js:1150, DELETE)
    - `POST /api/plants/:id/water` (server/index.js:1177, UPDATE)

### `products`

- **Columnas:** `id` UUID, `name` TEXT, `category` TEXT, `is_out_of_stock` BOOLEAN, `reminder_frequency_days` INTEGER, `units` INTEGER, `last_purchased_at` TIMESTAMPTZ, `last_out_of_stock_at` TIMESTAMPTZ, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:331, DELETE)
    - `POST /api/houses/seed` (server/index.js:492, INSERT)
    - `POST /api/products` (server/index.js:811, INSERT)
    - `POST /api/products/:id/purchase` (server/index.js:851, UPDATE)
    - `DELETE /api/products/:id` (server/index.js:868, DELETE)

### `push_subscriptions`

- **Columnas:** `id` UUID, `user_id` TEXT, `organization_id` TEXT, `endpoint` TEXT, `keys_p256dh` TEXT, `keys_auth` TEXT, `created_at` TIMESTAMPTZ, `updated_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `GET /api/push/status` (server/index.js:1349, SELECT)
    - helper `sendPushToHouse` (server/index.js:1364, SELECT)
- **Escritores (4):**
    - `DELETE /api/houses/:id` (server/index.js:335, DELETE)
    - `POST /api/push/subscribe` (server/index.js:1317, INSERT)
    - `DELETE /api/push/subscribe` (server/index.js:1339, DELETE) [sin filtro org]
    - helper `sendPushToHouse` (server/index.js:1378, DELETE) [sin filtro org]

### `shopping_categories`

- **Columnas:** `id` UUID, `name` TEXT, `emoji` TEXT, `sort_order` INTEGER, `organization_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (5):**
    - `GET /api/shopping-categories` (server/index.js:880, SELECT)
    - `POST /api/shopping-categories` (server/index.js:896, SELECT)
    - `GET /api/shopping-items` (server/index.js:957, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:1041, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1059, SELECT)
- **Escritores (3):**
    - `DELETE /api/houses/:id` (server/index.js:333, DELETE)
    - `POST /api/shopping-categories` (server/index.js:900, INSERT)
    - `DELETE /api/shopping-categories/:id` (server/index.js:933, DELETE)

### `shopping_items`

- **Columnas:** `id` UUID, `name` TEXT, `note` TEXT, `added_by` TEXT, `is_purchased` BOOLEAN, `category_id` UUID, `organization_id` TEXT, `purchased_at` TIMESTAMPTZ, `archived_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **FK:** `category_id` → `shopping_categories.id`
- **Multi-tenant:** si (organization_id)
- **Lectores (4):**
    - `GET /api/shopping-items` (server/index.js:957, SELECT)
    - `GET /api/shopping-items/history` (server/index.js:1041, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1059, SELECT)
    - `GET /api/shopping-items/recommendations` (server/index.js:1070, SELECT)
- **Escritores (5):**
    - `DELETE /api/houses/:id` (server/index.js:332, DELETE)
    - `GET /api/shopping-items` (server/index.js:946, UPDATE)
    - `POST /api/shopping-items` (server/index.js:975, INSERT)
    - `DELETE /api/shopping-items/clear-purchased` (server/index.js:1021, UPDATE)
    - `DELETE /api/shopping-items/:id` (server/index.js:1087, DELETE)

### `super_admins`

- **Columnas:** `id` UUID, `user_id` TEXT, `created_at` TIMESTAMPTZ
- **Multi-tenant:** no
- **Lectores (2):**
    - `GET /api/super-admin/check` (server/index.js:91, SELECT) [sin filtro org]
    - helper `requireSuperAdmin` (server/lib/middleware.js:84, SELECT) [sin filtro org]

### `tasks`

- **Columnas:** `id` UUID, `name` TEXT, `description` TEXT, `frequency_type` TEXT, `frequency_value` INTEGER, `is_active` BOOLEAN, `product_name` TEXT, `product_image` TEXT, `organization_id` TEXT, `last_reset_at` TIMESTAMPTZ, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (11):**
    - `GET /api/super-admin/stats` (server/index.js:108, SELECT) [sin filtro org]
    - `GET /api/super-admin/stats` (server/index.js:117, SELECT)
    - `POST /api/houses/seed` (server/index.js:364, SELECT)
    - `GET /api/tasks/pending` (server/index.js:535, SELECT)
    - `DELETE /api/tasks/:id` (server/index.js:611, SELECT)
    - `GET /api/completions` (server/index.js:631, SELECT)
    - `POST /api/completions` (server/index.js:649, SELECT)
    - `GET /api/completions/:taskId/history` (server/index.js:768, SELECT)
    - `GET /api/stats/participation` (server/index.js:1228, SELECT)
    - `GET /api/stats/participation` (server/index.js:1248, SELECT)
    - `GET /api/stats/participation` (server/index.js:1261, SELECT)
- **Escritores (7):**
    - `DELETE /api/houses/:id` (server/index.js:330, DELETE)
    - `POST /api/houses/seed` (server/index.js:400, INSERT)
    - `POST /api/houses/seed` (server/index.js:436, INSERT)
    - `POST /api/tasks` (server/index.js:577, INSERT)
    - `DELETE /api/tasks/:id` (server/index.js:619, DELETE)
    - `POST /api/completions` (server/index.js:682, UPDATE)
    - `POST /api/tasks/:id/reset` (server/index.js:753, UPDATE)

### `user` _(externa — better-auth u otra fuente)_

- **Lectores (3):**
    - `GET /api/super-admin/stats` (server/index.js:105, SELECT) [sin filtro org]
    - `GET /api/houses/members` (server/index.js:161, SELECT)
    - `GET /api/invitations` (server/index.js:260, SELECT)

### `visits`

- **Columnas:** `id` UUID, `organization_id` TEXT, `user_id` TEXT, `visited_on` DATE, `created_at` TIMESTAMPTZ
- **Multi-tenant:** si (organization_id)
- **Lectores (2):**
    - `POST /api/completions` (server/index.js:658, SELECT)
    - `GET /api/visits/active` (server/index.js:710, SELECT)
- **Escritores (1):**
    - `POST /api/visits` (server/index.js:737, INSERT)

