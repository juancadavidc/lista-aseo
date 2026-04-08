# Referencia Técnica — Casa Limpia

## Stack

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | React 18 + Vite | SPA, build estático servido por Nginx |
| Backend | Express.js (ESM) | Monolito en `server/index.js` |
| Auth | better-auth | Multi-org nativo, session-based con cookies |
| Base de datos | PostgreSQL 16 | SQL directo con `pg` (sin ORM) |
| Deploy | Docker Compose | 3 servicios: frontend, api, db |
| Proxy | Nginx | Estáticos + reverse proxy `/api` |

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────>│    Nginx     │────>│  React App   │
│  (Mobile)    │     │   :80/8080   │     │  (Static)    │
└─────────────┘     └──────────────┘     └──────────────┘
       │
       │ /api/*
       v
┌──────────────┐     ┌──────────────┐
│  Express.js  │────>│ PostgreSQL   │
│    :3001     │     │  :5432/5433  │
└──────────────┘     └──────────────┘
       │
       v
┌──────────────┐
│  /uploads    │
│  (Volume)    │
└──────────────┘
```

## Estructura del Proyecto

```
lista-aseo/
├── CLAUDE.md              ← Guía CEO y visión del producto
├── docs/
│   ├── TECHNICAL.md       ← Este archivo (referencia técnica)
│   ├── ESTANDARES_CODIGO.md ← Convenciones de código
│   ├── LINEAMIENTOS.md    ← Principios de desarrollo
│   └── CHANGELOG.md       ← Registro de cambios por fase
├── db/init.sql            ← Schema PostgreSQL
├── server/
│   ├── index.js           ← API Express (monolito, ~680 líneas)
│   └── auth.js            ← Config better-auth
├── frontend/src/
│   ├── pages/             ← Páginas (Home, Admin, Login, etc.)
│   ├── components/        ← Componentes reutilizables
│   └── lib/               ← API client, auth, helpers
└── docker-compose.yml     ← Orquestación de servicios
```

## Flujo de Datos

1. Usuario abre app → Nginx sirve React SPA
2. React verifica sesión → `GET /api/auth/get-session`
3. Si no hay sesión → redirect a `/login`
4. Si hay sesión pero no casa → redirect a `/house-select`
5. Con sesión + casa → carga datos con header `x-house-id`
6. Cada request API valida: sesión válida + membership en la casa
7. Datos filtrados por `organization_id` de la casa activa

## Schema de Base de Datos

### Tablas de negocio
- **tasks** — Tareas de aseo con frecuencia (daily/weekly/biweekly/monthly)
- **completions** — Registro de quién completó qué tarea y cuándo
- **products** — Inventario de productos de limpieza con alertas de recompra
- **shopping_categories** — Categorías para organizar la lista de compras
- **shopping_items** — Items de la lista de compras
- **house_member_profiles** — Avatar y color por miembro de cada casa
- **super_admins** — Usuarios con acceso al panel de super admin
- **push_subscriptions** — Suscripciones push por usuario y casa

### Tablas de auth (better-auth)
- user, session, organization, member — Manejadas automáticamente

## Entornos

| Entorno | Config | Acceso |
|---------|--------|--------|
| Local dev | `npm run dev` (Vite) + `node index.js` | localhost:5173 |
| Docker local | `docker compose up` | localhost:8080 |
| Benestare | `docker-compose.benestare.yml` | DB externa |

## Páginas Actuales

| Página | Archivo | Función |
|--------|---------|---------|
| Home | `pages/Home.jsx` | Dashboard de tareas del hogar |
| Login | `pages/Login.jsx` | Inicio de sesión |
| Register | `pages/Register.jsx` | Registro de usuarios |
| HouseSelect | `pages/HouseSelect.jsx` | Selección de casa activa |
| HouseSettings | `pages/HouseSettings.jsx` | Configuración de la casa |
| Admin | `pages/Admin.jsx` | Administración de tareas |
| Products | `pages/Products.jsx` | Gestión de productos de limpieza |
| ShoppingList | `pages/ShoppingList.jsx` | Lista de compras |
| ShoppingAdmin | `pages/ShoppingAdmin.jsx` | Admin de categorías de compras |
| Stats | `pages/Stats.jsx` | Estadísticas de participación |
| SuperAdmin | `pages/SuperAdmin.jsx` | Panel global de métricas |

## Reglas Técnicas Críticas

1. **Seguridad multi-tenant:** TODA query debe filtrar por `organization_id`. Nunca exponer datos entre casas.
2. **SQL seguro:** SIEMPRE usar parameterized queries (`$1, $2...`). NUNCA concatenar strings en SQL.
3. **Mobile-first:** Diseño pensado para 360px+, tap targets >= 44px.
4. **No romper lo existente:** Backward compatibility en API. Migraciones incrementales.
5. **Monolito backend:** `server/index.js` es el archivo principal. No fragmentar sin decisión explícita.
6. **Design system:** Colores `surface`, `clay`, `moss`, `bark` en Tailwind. No inventar nuevos sin justificación.
7. **Sin over-engineering:** No agregar abstracciones, validaciones o features que no se pidieron.
