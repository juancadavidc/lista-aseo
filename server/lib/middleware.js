// Middlewares extraidos del monolito para testeabilidad.
// Los factories reciben dependencias (auth, pool) e inyectan comportamiento.

import path from 'path'

/**
 * requireRole - middleware sincrono puro.
 * Requiere que req.house.role este definido (normalmente por requireHouse).
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.house || !roles.includes(req.house.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion' })
    }
    next()
  }
}

/**
 * createRequireAuth - factory que recibe la instancia de better-auth
 * y devuelve un middleware que resuelve la sesion a partir de los headers.
 */
export function createRequireAuth(auth) {
  return async function requireAuth(req, res, next) {
    try {
      const session = await auth.api.getSession({ headers: req.headers })
      if (!session) return res.status(401).json({ error: 'No autenticado' })
      req.user = session.user
      req.session = session.session
      next()
    } catch {
      return res.status(401).json({ error: 'No autenticado' })
    }
  }
}

/**
 * createRequireHouse - factory que recibe el pool de Postgres.
 * Verifica que el usuario sea miembro de la organizacion indicada en x-house-id.
 */
export function createRequireHouse(pool) {
  return async function requireHouse(req, res, next) {
    const houseId = req.headers['x-house-id']
    if (!houseId) return res.status(400).json({ error: 'Casa no seleccionada' })

    try {
      const { rows } = await pool.query(
        'SELECT * FROM "member" WHERE "userId" = $1 AND "organizationId" = $2',
        [req.user.id, houseId]
      )
      if (rows.length === 0) return res.status(403).json({ error: 'No eres miembro de esta casa' })

      req.house = { id: houseId, role: rows[0].role }
      next()
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

/**
 * createRequireSuperAdmin - factory que recibe el pool.
 * Verifica que el usuario autenticado este en la tabla super_admins.
 */
export function createRequireSuperAdmin(pool) {
  return async function requireSuperAdmin(req, res, next) {
    try {
      const { rows } = await pool.query(
        'SELECT id FROM super_admins WHERE user_id = $1',
        [req.user.id]
      )
      if (rows.length === 0) return res.status(403).json({ error: 'No tienes permisos de super admin' })
      next()
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }
}

/**
 * isAllowedImageExtension - predicate puro para validar extensiones de imagen.
 * Usado por multer fileFilter.
 */
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export function isAllowedImageExtension(filename) {
  if (typeof filename !== 'string' || filename.length === 0) return false
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext)
}

export { ALLOWED_IMAGE_EXTENSIONS }
