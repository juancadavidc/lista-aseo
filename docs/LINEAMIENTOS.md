# Lineamientos del Proyecto — Casa Limpia

## Principios de Desarrollo

### 1. Mobile-First
- Todo diseño se piensa primero para pantallas móviles (360px mínimo)
- Las interacciones táctiles son prioridad (ripple effects, gestos, tap targets >= 44px)
- El rendimiento en dispositivos de gama media es un requisito

### 2. Simplicidad sobre Complejidad
- Usuarios no técnicos (empleadas domésticas, familias)
- Interfaces claras, sin jerga técnica
- Flujos de máximo 2-3 pasos para acciones comunes

### 3. Aislamiento Multi-Tenant
- Toda query debe filtrar por `organization_id` (casa)
- Nunca exponer datos de una casa a otra
- El header `x-house-id` es obligatorio en requests autenticados

### 4. Progresividad
- Funcionalidades nuevas no deben romper las existentes
- Backward compatibility en la API
- Migraciones de DB incrementales, nunca destructivas

---

## Proceso de Trabajo

### Flujo para nuevas features
1. **Asesoría** — Se discute el alcance, impacto y prioridad
2. **Diseño** — Se define la solución técnica (ADR si es necesario)
3. **Implementación** — Se delega a agentes desarrolladores
4. **Revisión** — Se valida contra criterios de aceptación
5. **Merge** — Branch a main tras aprobación

### Flujo para bug fixes
1. **Diagnóstico** — Investigar causa raíz
2. **Fix** — Implementar corrección mínima
3. **Verificación** — Confirmar que el fix resuelve el problema sin regresiones

---

## Decisiones Arquitectónicas

| Decisión | Elección | Razón |
|----------|----------|-------|
| Frontend framework | React 18 + Vite | Ecosistema maduro, build rápido |
| Backend | Express.js (ESM) | Simplicidad, mismo lenguaje que frontend |
| Auth | better-auth | Multi-org nativo, session-based |
| DB | PostgreSQL 16 | Relacional robusto, JSON support |
| Deploy | Docker Compose | Reproducible, portable |
| Proxy | Nginx | Estático + reverse proxy eficiente |
