# Casa Limpia

App mobile-first para gestionar tareas de limpieza del hogar con frecuencias inteligentes. Pensada para servir en red local para que la persona del servicio sepa que le toca hacer.

## Levantar con Docker Compose

```bash
docker compose up --build -d
```

Abre `http://localhost:8080` en el navegador (o desde cualquier dispositivo en la red: `http://<IP-del-server>:8080`).

## Servicios

| Servicio | Puerto | Descripcion |
|----------|--------|-------------|
| **web** (nginx + React) | 8080 | Frontend |
| **api** (Express + Node) | 3001 | API REST |
| **db** (PostgreSQL 16) | 5432 | Base de datos |

## Desarrollo local

```bash
# Levantar solo la base de datos
docker compose up db -d

# Backend
cd server && npm install && node index.js

# Frontend (en otra terminal)
cd frontend && npm install && npm run dev
```

El frontend en dev hace proxy de `/api` al backend en `localhost:3001`.

## Estructura

```
lista-aseo/
├── docker-compose.yml
├── db/
│   └── init.sql          # Schema + datos de ejemplo
├── server/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js           # Express API
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── src/
    │   ├── lib/api.js      # Cliente fetch (reemplaza Supabase)
    │   ├── lib/tasks.js    # Logica de frecuencias
    │   ├── pages/          # Home + Admin
    │   └── components/     # TaskCard, TaskForm, etc.
    └── ...
```

## Parar y limpiar

```bash
docker compose down        # parar
docker compose down -v     # parar y borrar datos
```
