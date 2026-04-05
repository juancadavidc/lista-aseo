# Estándares de Código — Casa Limpia

## General

- **Lenguaje:** JavaScript (ES Modules)
- **Sin TypeScript en runtime** (solo types para dev vía @types/)
- **Indentación:** 2 espacios
- **Strings:** Comillas simples en JS, backticks para interpolación
- **Semicolons:** No (estilo del proyecto actual)
- **Trailing commas:** Sí en objetos y arrays multi-línea

## Frontend (React + Vite)

### Componentes
- Functional components con hooks (no class components)
- Un componente principal por archivo
- Nombre de archivo = nombre del componente (PascalCase)
- Props destructuradas en los parámetros

### Estructura de archivos
```
src/
  pages/        → Páginas/rutas (PascalCase.jsx)
  components/   → Componentes reutilizables (PascalCase.jsx)
  lib/          → Utilidades y configuración (camelCase.js)
```

### Estilos
- **Tailwind CSS** como método principal
- Clases utilitarias inline (no @apply salvo casos justificados)
- Colores del design system: `surface`, `clay`, `moss`, `bark`
- Animaciones custom definidas en `tailwind.config.js`

### Estado
- `useState` / `useEffect` para estado local
- No hay state manager global — evaluar si se necesita antes de agregar
- Fetch de datos en `useEffect` con cleanup

### Navegación
- `react-router-dom` v6
- Rutas definidas en `main.jsx`
- Protección de rutas mediante verificación de sesión

## Backend (Express.js)

### API
- Prefijo `/api/` para todos los endpoints
- RESTful: GET (leer), POST (crear), PATCH (actualizar parcial), DELETE (eliminar)
- Responses en JSON con status codes apropiados
- Errores: `{ error: 'mensaje descriptivo' }` con status 4xx/5xx

### Seguridad
- Validar sesión con `auth.api.getSession()` en rutas protegidas
- Validar membership a la casa en cada request
- Sanitizar inputs antes de queries SQL
- Usar parameterized queries (`$1, $2...`), NUNCA concatenar SQL

### Base de Datos
- Queries directas con `pg` client (no ORM)
- Nombres de tablas y columnas en `snake_case`
- Foreign keys con `ON DELETE CASCADE` donde aplique
- Índices en columnas de búsqueda frecuente

### Uploads
- Multer para manejo de archivos
- Validar tipo y tamaño de archivo
- Almacenamiento en volumen Docker `/uploads`

## Convenciones Git

### Branches
- `main` — producción estable
- `claude/<descripcion>` — branches de desarrollo
- Nombres descriptivos en kebab-case

### Commits
- Mensajes en inglés
- Formato: `<tipo>: <descripción concisa>`
- Tipos: `Add`, `Fix`, `Update`, `Remove`, `Refactor`
- Ejemplo: `Add task frequency validation endpoint`

### Pull Requests
- Título corto (< 70 chars)
- Body con Summary y Test Plan
- Un PR por feature/fix lógico
