# Push Notifications — Referencia Técnica

## Arquitectura

```
Usuario activa toggle → Browser pide permiso → PushManager crea suscripción →
Backend guarda en BD → Evento (tarea completada) → web-push envía al endpoint →
Service Worker recibe → showNotification() → Click abre la app
```

### Actores

| Actor | Archivo | Rol |
|-------|---------|-----|
| Service Worker | `frontend/public/sw.js` | Recibe push events, muestra notificación, maneja clicks |
| UI (toggle) | `frontend/src/pages/HouseSettings.jsx` | Pide permiso, crea/elimina suscripción |
| API client | `frontend/src/lib/api.js` | Funciones: `fetchVapidKey`, `subscribePush`, `unsubscribePush`, `fetchPushStatus` |
| Backend | `server/index.js` | Endpoints REST, envío con `web-push`, gestión de suscripciones |
| Base de datos | Tabla `push_subscriptions` | Almacena suscripciones por usuario y casa |

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/push/vapid-key` | No | Retorna VAPID public key |
| POST | `/api/push/subscribe` | Sí + house | Guarda suscripción (upsert por endpoint) |
| DELETE | `/api/push/subscribe` | Sí | Elimina suscripción por endpoint |
| GET | `/api/push/status` | Sí + house | Retorna `{ subscribed: boolean }` |

## Tabla `push_subscriptions`

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  endpoint        TEXT NOT NULL UNIQUE,
  keys_p256dh     TEXT NOT NULL,
  keys_auth       TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- Índices: idx_push_subs_org (organization_id), idx_push_subs_user (user_id)
```

## Flujo de suscripción

1. **Toggle ON** en HouseSettings (`handleTogglePush()`)
2. `Notification.requestPermission()` — pide permiso al browser
3. `GET /api/push/vapid-key` — obtiene clave pública VAPID
4. `urlBase64ToUint8Array()` convierte la clave a formato requerido
5. `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` — crea suscripción con endpoint único + claves de encriptación
6. `POST /api/push/subscribe` — guarda `endpoint`, `keys.p256dh`, `keys.auth` asociados a `user_id` y `organization_id`

## Flujo de envío

1. **Trigger**: `POST /api/completions` (alguien completa una tarea)
2. Llama `sendPushToHouse(houseId, { title, body, tag })`
3. Consulta todas las suscripciones de esa `organization_id`
4. `webpush.sendNotification(subscription, payload)` por cada una
5. Si endpoint retorna **410/404** → borra suscripción (expirada/revocada)
6. Usa `Promise.allSettled` para tolerancia a fallos parciales

## Flujo de recepción (Service Worker)

1. Evento `push` → parsea JSON → `self.registration.showNotification(title, options)`
2. Evento `notificationclick` → cierra notificación → enfoca ventana existente o abre nueva con URL del payload

## Seguridad

- **VAPID keys**: autentican el servidor ante servicios push (Google FCM, Mozilla). Private key solo en `.env` del server.
- **Encriptación E2E**: claves `p256dh` y `auth` encriptan el payload — el servicio push intermedio no puede leer el contenido.
- **Multi-tenant**: `sendPushToHouse()` filtra por `organization_id` — no hay filtración entre casas.

## Variables de entorno

```
VAPID_PUBLIC_KEY=...    # Clave pública (compartida con el client)
VAPID_PRIVATE_KEY=...   # Clave privada (solo server)
VAPID_SUBJECT=mailto:.. # Email para header VAPID
```

## Triggers actuales

| Evento | Payload | Ubicación |
|--------|---------|-----------|
| Tarea completada | `{ title: "Tarea completada", body: "{user} completó: {task}", tag: "task-completed" }` | `server/index.js` POST `/api/completions` |
| Planta regada | `{ title: "Planta regada", body: "{user} regó: {plant}", tag: "plant-watered" }` | `server/index.js` POST `/api/plants/:id/water` |
| Compra marcada | `{ title: "Compra marcada", body: "{user} compró: {item}", tag: "shopping-item-purchased", url: "/shopping" }` | `server/index.js` PATCH `/api/shopping-items/:id` (solo al transitar `is_purchased` de `false` a `true`) |

Para agregar nuevos triggers, reutilizar `sendPushToHouse(orgId, payload)` con un payload diferente.

## Dependencias

- **Backend**: `web-push@^3.6.7`
- **Browser APIs**: `ServiceWorker`, `PushManager`, `Notification`
