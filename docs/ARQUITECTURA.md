# Arquitectura — Casa Limpia

## Vista General

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│    Nginx     │────▶│  React App   │
│  (Mobile)    │     │   :80/8080   │     │  (Static)    │
└─────────────┘     └──────────────┘     └──────────────┘
       │
       │ /api/*
       ▼
┌──────────────┐     ┌──────────────┐
│  Express.js  │────▶│ PostgreSQL   │
│    :3001     │     │  :5432/5433  │
└──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│  /uploads    │
│  (Volume)    │
└──────────────┘
```

## Componentes

### Frontend (React + Vite)
- **Build:** Vite genera bundle estático en `/dist`
- **Serve:** Nginx sirve estáticos y proxea `/api` al backend
- **Auth:** better-auth client maneja sesión en cookies
- **API Client:** `lib/api.js` wrapper con auto-auth y `x-house-id`

### Backend (Express.js)
- **Monolito** — un solo archivo `index.js` (~680 líneas)
- **Auth middleware** via better-auth con plugin de organizaciones
- **File uploads** via multer en ruta `/api/uploads`
- **SQL directo** con pg client (sin ORM)

### Base de Datos (PostgreSQL 16)
- **Schema** definido en `db/init.sql`
- **Tablas de negocio:** tasks, completions, products, shopping_items, house_member_profiles
- **Tablas de auth:** manejadas por better-auth (user, session, organization, member)
- **Aislamiento:** todo filtrado por `organization_id`

### Docker Compose
- **3 servicios:** frontend, api, db
- **Volúmenes:** postgres_data, uploads
- **Red interna:** comunicación entre servicios
- **Puertos expuestos:** 8080 (web), 5433 (DB debug)

## Flujo de Datos

1. Usuario abre app → Nginx sirve React SPA
2. React verifica sesión → `GET /api/auth/get-session`
3. Si no hay sesión → redirect a `/login`
4. Si hay sesión pero no casa → redirect a `/house-select`
5. Con sesión + casa → carga datos con header `x-house-id`
6. Cada request API valida: sesión válida + membership en la casa
7. Datos filtrados por `organization_id` de la casa activa

## Entornos

| Entorno | Config | Acceso |
|---------|--------|--------|
| Local dev | `npm run dev` (Vite) + `node index.js` | localhost:5173 |
| Docker local | `docker compose up` | localhost:8080 |
| Benestare | `docker-compose.benestare.yml` | DB externa |
