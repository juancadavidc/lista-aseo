import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pg from 'pg'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { toNodeHandler } from 'better-auth/node'
import { createAuth } from './auth.js'
import webpush from 'web-push'
import {
  requireRole,
  denyExternalMembers,
  createRequireAuth,
  createRequireHouse,
  createRequireSuperAdmin,
  isAllowedImageExtension,
} from './lib/middleware.js'
import {
  buildPatchUpdate,
  TASK_UPDATABLE_COLUMNS,
  PRODUCT_UPDATABLE_COLUMNS,
  SHOPPING_CATEGORY_UPDATABLE_COLUMNS,
  SHOPPING_ITEM_UPDATABLE_COLUMNS,
} from './lib/patch-update.js'
import { buildRecommendations } from './lib/shopping-recommendations.js'

const SHOPPING_AUTO_ARCHIVE_DAYS = 7

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.join(__dirname, 'uploads')

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, crypto.randomUUID() + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (isAllowedImageExtension(file.originalname)) cb(null, true)
    else cb(new Error('Solo se permiten imagenes .jpg, .png, .webp'))
  },
})

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'casalimpia',
  user: process.env.DB_USER || 'casalimpia',
  password: process.env.DB_PASSWORD || 'casalimpia',
})

// --- Better Auth ---
const auth = createAuth(pool)

const app = express()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
app.use(cors({
  origin: FRONTEND_URL.split(','),
  credentials: true,
}))
app.use(express.json())
app.use('/api/uploads', express.static(UPLOADS_DIR))

// Mount Better Auth - handles /api/auth/* routes
app.all('/api/auth/*', toNodeHandler(auth))

// --- Middlewares (instanciados desde ./lib/middleware.js) ---

const requireAuth = createRequireAuth(auth)
const requireHouse = createRequireHouse(pool)
const requireSuperAdmin = createRequireSuperAdmin(pool)

// GET /api/super-admin/check - check if current user is super admin
app.get('/api/super-admin/check', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM super_admins WHERE user_id = $1',
      [req.user.id]
    )
    res.json({ isSuperAdmin: rows.length > 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/super-admin/stats - global app stats
app.get('/api/super-admin/stats', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [users, orgs, members, tasks, completions, recentCompletions, activeOrgs] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM "user"'),
      pool.query('SELECT COUNT(*) as count FROM "organization"'),
      pool.query('SELECT COUNT(*) as count FROM "member"'),
      pool.query('SELECT COUNT(*) as count FROM tasks'),
      pool.query('SELECT COUNT(*) as count FROM completions'),
      pool.query(`
        SELECT DATE(completed_at) as day, COUNT(*) as count
        FROM completions
        WHERE completed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(completed_at)
        ORDER BY day
      `),
      pool.query(`
        SELECT o.id, o.name, o.slug, COUNT(DISTINCT m."userId") as member_count,
               COUNT(DISTINCT t.id) as task_count,
               COUNT(DISTINCT c.id) as completion_count,
               MAX(c.completed_at) as last_activity
        FROM "organization" o
        LEFT JOIN "member" m ON m."organizationId" = o.id
        LEFT JOIN tasks t ON t.organization_id = o.id
        LEFT JOIN completions c ON c.task_id = t.id
        GROUP BY o.id, o.name, o.slug
        ORDER BY last_activity DESC NULLS LAST
      `),
    ])

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalOrganizations: parseInt(orgs.rows[0].count),
      totalMembers: parseInt(members.rows[0].count),
      totalTasks: parseInt(tasks.rows[0].count),
      totalCompletions: parseInt(completions.rows[0].count),
      completionsLast30Days: recentCompletions.rows.map(r => ({
        day: r.day,
        count: parseInt(r.count),
      })),
      organizations: activeOrgs.rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        memberCount: parseInt(r.member_count),
        taskCount: parseInt(r.task_count),
        completionCount: parseInt(r.completion_count),
        lastActivity: r.last_activity,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- House Member Profiles ---

// GET /api/houses/members - list members with profiles
app.get('/api/houses/members', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m."userId", m.role, m."createdAt",
             u.name, u.email,
             COALESCE(p.avatar, '🧑') as avatar,
             COALESCE(p.color, '#6a9960') as color,
             COALESCE(p.member_type, 'regular') as member_type
      FROM "member" m
      JOIN "user" u ON m."userId" = u.id
      LEFT JOIN house_member_profiles p ON p.user_id = m."userId" AND p.organization_id = m."organizationId"
      WHERE m."organizationId" = $1
      ORDER BY m."createdAt"
    `, [req.house.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const VALID_MEMBER_TYPES = ['regular', 'externo']

// PATCH /api/houses/members/:userId/type - owner/admin marca a un miembro como externo (o regular)
app.patch('/api/houses/members/:userId/type', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { userId } = req.params
    const { member_type } = req.body
    if (!VALID_MEMBER_TYPES.includes(member_type)) {
      return res.status(400).json({ error: 'Tipo de miembro invalido' })
    }
    const { rows: target } = await pool.query(
      'SELECT role FROM "member" WHERE "userId" = $1 AND "organizationId" = $2',
      [userId, req.house.id]
    )
    if (target.length === 0) return res.status(404).json({ error: 'Miembro no encontrado' })
    if (target[0].role === 'owner') return res.status(400).json({ error: 'No puedes cambiar el tipo del dueño' })

    await pool.query(`
      INSERT INTO house_member_profiles (user_id, organization_id, member_type)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET member_type = EXCLUDED.member_type
    `, [userId, req.house.id, member_type])
    res.json({ user_id: userId, member_type })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const VALID_HOME_SCREENS = ['tasks', 'shopping', 'products', 'stats', 'plants']

// GET /api/houses/profile - get my profile for active house
app.get('/api/houses/profile', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM house_member_profiles WHERE user_id = $1 AND organization_id = $2',
      [req.user.id, req.house.id]
    )
    if (rows.length === 0) {
      return res.json({ user_id: req.user.id, organization_id: req.house.id, avatar: '🧑', color: '#6a9960', home_screen: 'tasks', member_type: 'regular' })
    }
    const profile = rows[0]
    if (!profile.home_screen) profile.home_screen = 'tasks'
    if (!profile.member_type) profile.member_type = 'regular'
    res.json(profile)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/houses/profile - update my avatar/color/home_screen for active house
app.put('/api/houses/profile', requireAuth, requireHouse, async (req, res) => {
  try {
    const { avatar, color, home_screen } = req.body
    if (home_screen !== undefined && !VALID_HOME_SCREENS.includes(home_screen)) {
      return res.status(400).json({ error: 'Pantalla de inicio invalida' })
    }
    const { rows: existing } = await pool.query(
      'SELECT avatar, color, home_screen FROM house_member_profiles WHERE user_id = $1 AND organization_id = $2',
      [req.user.id, req.house.id]
    )
    const current = existing[0] || { avatar: '🧑', color: '#6a9960', home_screen: 'tasks' }
    const nextAvatar = avatar !== undefined ? avatar : current.avatar
    const nextColor = color !== undefined ? color : current.color
    const nextHomeScreen = home_screen !== undefined ? home_screen : (current.home_screen || 'tasks')
    const { rows } = await pool.query(`
      INSERT INTO house_member_profiles (user_id, organization_id, avatar, color, home_screen)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET avatar = EXCLUDED.avatar, color = EXCLUDED.color, home_screen = EXCLUDED.home_screen
      RETURNING *
    `, [req.user.id, req.house.id, nextAvatar || '🧑', nextColor || '#6a9960', nextHomeScreen])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/invitations - list pending invitations for active house (owner/admin only)
app.get('/api/invitations', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT i.id, i.email, i.role, i.status, i."expiresAt", i."inviterId",
             u.name as inviter_name, u.email as inviter_email
      FROM "invitation" i
      LEFT JOIN "user" u ON u.id = i."inviterId"
      WHERE i."organizationId" = $1 AND i.status = 'pending'
      ORDER BY i."expiresAt" DESC
    `, [req.house.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/invitations/:id - revoke a pending invitation (owner/admin only)
app.delete('/api/invitations/:id', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM "invitation" WHERE id = $1 AND "organizationId" = $2 AND status = 'pending'`,
      [req.params.id, req.house.id]
    )
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Invitacion no encontrada' })
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/invitations/:id/renew - extend expiration by 7 days (owner/admin only)
app.post('/api/invitations/:id/renew', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE "invitation"
       SET "expiresAt" = NOW() + INTERVAL '7 days'
       WHERE id = $1 AND "organizationId" = $2 AND status = 'pending'
       RETURNING id, email, role, status, "expiresAt"`,
      [req.params.id, req.house.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invitacion no encontrada' })
    }
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/houses/:id - delete a house and all its data (owner only)
app.delete('/api/houses/:id', requireAuth, async (req, res) => {
  const houseId = req.params.id
  if (!houseId) return res.status(400).json({ error: 'Casa no especificada' })

  const client = await pool.connect()
  try {
    // Verify caller is owner of this house
    const { rows } = await client.query(
      'SELECT role FROM "member" WHERE "userId" = $1 AND "organizationId" = $2',
      [req.user.id, houseId]
    )
    if (rows.length === 0) {
      return res.status(403).json({ error: 'No eres miembro de esta casa' })
    }
    if (rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Solo el dueno puede eliminar la casa' })
    }

    await client.query('BEGIN')
    // Custom tables (organization_id has no FK, so clean explicitly)
    await client.query('DELETE FROM tasks WHERE organization_id = $1', [houseId])
    await client.query('DELETE FROM products WHERE organization_id = $1', [houseId])
    await client.query('DELETE FROM shopping_items WHERE organization_id = $1', [houseId])
    await client.query('DELETE FROM shopping_categories WHERE organization_id = $1', [houseId])
    await client.query('DELETE FROM house_member_profiles WHERE organization_id = $1', [houseId])
    await client.query('DELETE FROM push_subscriptions WHERE organization_id = $1', [houseId])
    await client.query(
      'DELETE FROM plant_watering_history WHERE plant_id IN (SELECT id FROM plants WHERE organization_id = $1)',
      [houseId]
    )
    await client.query('DELETE FROM plants WHERE organization_id = $1', [houseId])
    // Better-auth tables
    await client.query('DELETE FROM "invitation" WHERE "organizationId" = $1', [houseId])
    await client.query('DELETE FROM "member" WHERE "organizationId" = $1', [houseId])
    await client.query('DELETE FROM "organization" WHERE id = $1', [houseId])
    await client.query('COMMIT')

    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// POST /api/houses/seed - insert example tasks and products for a new house
app.post('/api/houses/seed', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const orgId = req.house.id
    const template = req.body.template || 'small'
    const customTasks = req.body.tasks // optional array of task objects

    // Check if house already has data
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) as c FROM tasks WHERE organization_id = $1', [orgId]
    )
    if (parseInt(existing[0].c) > 0) {
      return res.status(400).json({ error: 'Esta casa ya tiene datos' })
    }

    if (template === 'empty' && (!customTasks || customTasks.length === 0)) {
      return res.json({ ok: true, template })
    }

    // Insert tasks — from custom array if provided, otherwise from hardcoded templates
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'once']

    if (customTasks && customTasks.length > 0) {
      // Validate each task
      for (const t of customTasks) {
        if (!t.name || typeof t.name !== 'string' || !t.name.trim()) {
          return res.status(400).json({ error: 'Cada tarea debe tener un nombre' })
        }
        if (!t.frequency_type || !validFrequencies.includes(t.frequency_type)) {
          return res.status(400).json({ error: `Frecuencia invalida: ${t.frequency_type}` })
        }
        if (!t.frequency_value || typeof t.frequency_value !== 'number' || t.frequency_value < 1) {
          return res.status(400).json({ error: 'frequency_value debe ser un numero positivo' })
        }
      }

      const tasks = customTasks.map(t => [t.name.trim(), t.description || '', t.frequency_type, t.frequency_value])
      const values = tasks.map((_, i) => {
        const base = i * 4
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, true, $${tasks.length * 4 + 1})`
      }).join(', ')
      const params = tasks.flat()
      params.push(orgId)

      await pool.query(
        `INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active, organization_id) VALUES ${values}`,
        params
      )
    } else if (template !== 'empty') {
      // Legacy template-based seeding
      const smallTasks = [
        ['Barrer la cocina',      'Incluir debajo de la nevera',             'daily',    1],
        ['Fregar el suelo',       'Cocina, bano y pasillo',                  'daily',    2],
        ['Limpiar el bano',       'Lavabo, ducha, inodoro y espejo',         'weekly',   7],
        ['Pasar la aspiradora',   'Sala y dormitorios',                      'weekly',   7],
        ['Limpiar microondas',    'Interior y exterior',                     'weekly',   7],
        ['Cambiar sabanas',       'Todas las camas',                         'biweekly', 14],
        ['Limpiar nevera',        'Sacar todo y limpiar estantes',           'monthly',  30],
        ['Desempolvar muebles',   'Estanterias, cuadros y rincones altos',  'weekly',   7],
      ]

      const familyExtra = [
        ['Lavar ventanas',        'Cristales interiores y marcos',           'monthly',  30],
        ['Limpiar horno',         'Rejillas y interior',                     'monthly',  30],
        ['Ordenar juguetes',      'Sala de estar y dormitorios',             'daily',    1],
        ['Limpiar patio/terraza', 'Barrer y recoger hojas',                  'weekly',   7],
        ['Sacar la basura',       'Organica y reciclaje',                    'daily',    2],
        ['Limpiar garage',        'Barrer y organizar',                      'monthly',  30],
        ['Lavar platos',          'Despues de cada comida',                  'daily',    1],
        ['Tender camas',          'Todas las habitaciones',                  'daily',    1],
      ]

      const tasks = template === 'family' ? [...smallTasks, ...familyExtra] : smallTasks
      const values = tasks.map((_, i) => {
        const base = i * 4
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, true, $${tasks.length * 4 + 1})`
      }).join(', ')
      const params = tasks.flat()
      params.push(orgId)

      await pool.query(
        `INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active, organization_id) VALUES ${values}`,
        params
      )
    }

    // Products based on template type
    const baseProducts = [
      ['Jabon lavavajillas',    'limpieza',   30],
      ['Lejia',                 'limpieza',   30],
      ['Fregasuelos',           'limpieza',   30],
      ['Limpiacristales',       'limpieza',   60],
      ['Esponjas',              'limpieza',   30],
      ['Bolsas de basura',      'limpieza',   14],
      ['Papel higienico',       'bano',       14],
      ['Jabon de manos',        'bano',       30],
      ['Detergente ropa',       'lavanderia', 30],
    ]

    const familyProducts = [
      ['Suavizante',            'lavanderia', 30],
      ['Ambientador',           'bano',       30],
      ['Desinfectante',         'limpieza',   30],
      ['Trapos de cocina',      'limpieza',   60],
      ['Quitagrasas',           'limpieza',   45],
    ]

    const airbnbProducts = [
      ['Desinfectante',         'limpieza',   14],
      ['Ambientador',           'bano',       14],
    ]

    const oficinaProducts = [
      ['Jabon de manos',        'bano',       14],
      ['Papel higienico',       'bano',       14],
      ['Toallas de papel',      'bano',       14],
      ['Bolsas de basura',      'limpieza',   7],
      ['Desinfectante',         'limpieza',   14],
      ['Limpiacristales',       'limpieza',   30],
      ['Fregasuelos',           'limpieza',   14],
    ]

    let products = []
    if (template === 'family') products = [...baseProducts, ...familyProducts]
    else if (template === 'airbnb') products = [...baseProducts, ...airbnbProducts]
    else if (template === 'oficina') products = oficinaProducts
    else if (template !== 'empty') products = baseProducts

    if (products.length > 0) {
      const pValues = products.map((_, i) => {
        const base = i * 3
        return `($${base + 1}, $${base + 2}, $${base + 3}, false, $${products.length * 3 + 1})`
      }).join(', ')
      const pParams = products.flat()
      pParams.push(orgId)

      await pool.query(
        `INSERT INTO products (name, category, reminder_frequency_days, is_out_of_stock, organization_id) VALUES ${pValues}`,
        pParams
      )
    }

    res.json({ ok: true, template })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

// --- Uploads ---

app.post('/api/uploads', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se proporciono imagen' })
  res.json({ filename: req.file.filename })
})

app.delete('/api/uploads/:filename', requireAuth, (req, res) => {
  const safeName = path.basename(req.params.filename)
  const filePath = path.join(UPLOADS_DIR, safeName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  res.json({ ok: true })
})

// --- Tasks (scoped by house) ---

// GET /api/tasks/pending
app.get('/api/tasks/pending', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, c.last_completed_at
      FROM tasks t
      LEFT JOIN (
        SELECT task_id, MAX(completed_at) AS last_completed_at
        FROM completions
        GROUP BY task_id
      ) c ON t.id = c.task_id
      WHERE t.is_active = true
        AND t.organization_id = $1
        AND (
          c.last_completed_at IS NULL
          OR (t.frequency_type <> 'once' AND NOW() >= c.last_completed_at + (t.frequency_value * INTERVAL '1 day'))
          OR (t.last_reset_at IS NOT NULL AND t.last_reset_at > c.last_completed_at)
        )
      ORDER BY t.name
    `, [req.house.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tasks
app.get('/api/tasks', requireAuth, requireHouse, async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true'
    let query = 'SELECT * FROM tasks WHERE organization_id = $1'
    if (activeOnly) query += ' AND is_active = true'
    query += ' ORDER BY name'
    const { rows } = await pool.query(query, [req.house.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tasks
// Cualquier miembro de la casa puede crear tareas (el personal externo no).
app.post('/api/tasks', requireAuth, requireHouse, denyExternalMembers, async (req, res) => {
  try {
    const { name, description, frequency_type, frequency_value, is_active, product_name, product_image } = req.body
    const { rows } = await pool.query(
      `INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active, product_name, product_image, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, description, frequency_type, frequency_value, is_active ?? true, product_name || null, product_image || null, req.house.id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const fields = { ...req.body }
    delete fields.organization_id
    delete fields.id

    const built = buildPatchUpdate('tasks', fields, TASK_UPDATABLE_COLUMNS)
    if (built.error) return res.status(400).json({ error: built.error })

    const { rows } = await pool.query(built.sql, [id, req.house.id, ...built.values])
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { rows: taskRows } = await pool.query(
      'SELECT product_image FROM tasks WHERE id = $1 AND organization_id = $2', [id, req.house.id]
    )
    if (taskRows.length > 0 && taskRows[0].product_image) {
      const filePath = path.join(UPLOADS_DIR, taskRows[0].product_image)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await pool.query('DELETE FROM completions WHERE task_id = $1', [id])
    await pool.query('DELETE FROM tasks WHERE id = $1 AND organization_id = $2', [id, req.house.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Completions ---

// GET /api/completions
app.get('/api/completions', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.task_id, c.completed_at, c.completed_by, c.user_id
      FROM completions c
      JOIN tasks t ON c.task_id = t.id
      WHERE t.organization_id = $1
      ORDER BY c.completed_at DESC
    `, [req.house.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/completions
app.post('/api/completions', requireAuth, requireHouse, async (req, res) => {
  try {
    const { task_id, completed_at } = req.body
    // Verify task belongs to this house
    const { rows: taskCheck } = await pool.query(
      'SELECT id, name, frequency_type FROM tasks WHERE id = $1 AND organization_id = $2', [task_id, req.house.id]
    )
    if (taskCheck.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' })

    // El personal externo no fija la fecha: sus tareas heredan la fecha de la visita
    // marcada (nunca posterior), para que los contadores no se corran al registrar tarde.
    let completedAt = completed_at || new Date().toISOString()
    if (req.house.memberType === 'externo') {
      const { rows: visit } = await pool.query(`
        SELECT to_char(visited_on, 'YYYY-MM-DD') AS d
        FROM visits
        WHERE organization_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [req.house.id, req.user.id])
      if (visit.length === 0) {
        return res.status(400).json({ error: 'Marca tu llegada antes de registrar tareas' })
      }
      // Mediodia UTC del dia de la visita: mantiene el mismo dia calendario en los
      // contadores y, si la visita es hoy, se topa con el momento actual.
      const visitTs = new Date(`${visit[0].d}T12:00:00.000Z`)
      const now = new Date()
      completedAt = (visitTs > now ? now : visitTs).toISOString()
    }

    const { rows } = await pool.query(
      'INSERT INTO completions (task_id, completed_at, completed_by, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [task_id, completedAt, req.user.name || null, req.user.id]
    )

    // Tareas efimeras de una sola vez: se desactivan automaticamente al cumplirse.
    if (taskCheck[0].frequency_type === 'once') {
      await pool.query(
        'UPDATE tasks SET is_active = false WHERE id = $1 AND organization_id = $2',
        [task_id, req.house.id]
      )
    }

    // Send push notification to house members
    const taskName = taskCheck[0].name || 'una tarea'
    const userName = req.user.name || 'Alguien'
    sendPushToHouse(req.house.id, {
      title: 'Tarea completada',
      body: `${userName} completo: ${taskName}`,
      tag: 'task-completed',
    })

    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Visitas del personal externo ---

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/visits/active - ultima visita registrada por el usuario en esta casa
app.get('/api/visits/active', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, to_char(visited_on, 'YYYY-MM-DD') AS visited_on, created_at
      FROM visits
      WHERE organization_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [req.house.id, req.user.id])
    res.json(rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/visits - el externo marca su llegada (fecha de la visita, nunca futura)
app.post('/api/visits', requireAuth, requireHouse, async (req, res) => {
  try {
    if (req.house.memberType !== 'externo') {
      return res.status(403).json({ error: 'Solo el rol externo marca llegada' })
    }
    const { visited_on } = req.body
    if (!visited_on || !DATE_RE.test(visited_on)) {
      return res.status(400).json({ error: 'Fecha de visita invalida' })
    }
    const { rows: chk } = await pool.query('SELECT ($1::date > CURRENT_DATE) AS future', [visited_on])
    if (chk[0].future) {
      return res.status(400).json({ error: 'La fecha de la visita no puede ser futura' })
    }
    const { rows } = await pool.query(`
      INSERT INTO visits (organization_id, user_id, visited_on)
      VALUES ($1, $2, $3)
      RETURNING id, to_char(visited_on, 'YYYY-MM-DD') AS visited_on, created_at
    `, [req.house.id, req.user.id, visited_on])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tasks/:id/reset
// Marca la tarea como pendiente sin borrar historial de completions.
app.post('/api/tasks/:id/reset', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      'UPDATE tasks SET last_reset_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *',
      [id, req.house.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/completions/:taskId/history
app.get('/api/completions/:taskId/history', requireAuth, requireHouse, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const { rows } = await pool.query(`
      SELECT c.* FROM completions c
      JOIN tasks t ON c.task_id = t.id
      WHERE c.task_id = $1 AND t.organization_id = $2
      ORDER BY c.completed_at DESC LIMIT $3
    `, [req.params.taskId, req.house.id, limit])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Products (scoped by house) ---

// GET /api/products
app.get('/api/products', requireAuth, requireHouse, async (req, res) => {
  try {
    const category = req.query.category
    const outOfStock = req.query.out_of_stock
    let query = 'SELECT * FROM products WHERE organization_id = $1'
    const params = [req.house.id]

    if (category) {
      params.push(category)
      query += ` AND category = $${params.length}`
    }
    if (outOfStock === 'true') {
      query += ' AND is_out_of_stock = true'
    }

    query += ' ORDER BY is_out_of_stock DESC, name'
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products
app.post('/api/products', requireAuth, requireHouse, async (req, res) => {
  try {
    const { name, category, reminder_frequency_days, is_out_of_stock, units } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await pool.query(
      `INSERT INTO products (name, category, reminder_frequency_days, is_out_of_stock, units, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name.trim(), category || 'general', reminder_frequency_days || 30, is_out_of_stock ?? false, Math.max(1, parseInt(units) || 1), req.house.id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/products/:id
app.patch('/api/products/:id', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    const fields = { ...req.body }
    delete fields.organization_id
    delete fields.id

    // Cuando cambia is_out_of_stock, sincronizamos el timestamp de agotado
    // sin que el cliente tenga que pasarlo explicitamente.
    if ('is_out_of_stock' in fields) {
      fields.last_out_of_stock_at = fields.is_out_of_stock ? new Date() : null
    }

    const built = buildPatchUpdate('products', fields, PRODUCT_UPDATABLE_COLUMNS)
    if (built.error) return res.status(400).json({ error: built.error })

    const { rows } = await pool.query(built.sql, [id, req.house.id, ...built.values])
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products/:id/purchase
app.post('/api/products/:id/purchase', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `UPDATE products
       SET last_purchased_at = NOW(), is_out_of_stock = false, last_out_of_stock_at = NULL
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, req.house.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/products/:id
app.delete('/api/products/:id', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM products WHERE id = $1 AND organization_id = $2', [id, req.house.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Shopping Categories (scoped by house) ---

// GET /api/shopping-categories
app.get('/api/shopping-categories', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM shopping_categories WHERE organization_id = $1 ORDER BY sort_order, name',
      [req.house.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/shopping-categories
app.post('/api/shopping-categories', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { name, emoji } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    // Get next sort_order
    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM shopping_categories WHERE organization_id = $1',
      [req.house.id]
    )
    const { rows } = await pool.query(
      'INSERT INTO shopping_categories (name, emoji, sort_order, organization_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), emoji || '📦', maxRows[0].next_order, req.house.id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/shopping-categories/:id
app.patch('/api/shopping-categories/:id', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    const fields = { ...req.body }
    delete fields.organization_id
    delete fields.id

    const built = buildPatchUpdate('shopping_categories', fields, SHOPPING_CATEGORY_UPDATABLE_COLUMNS)
    if (built.error) return res.status(400).json({ error: built.error })

    const { rows } = await pool.query(built.sql, [id, req.house.id, ...built.values])
    if (rows.length === 0) return res.status(404).json({ error: 'Category not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/shopping-categories/:id
app.delete('/api/shopping-categories/:id', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM shopping_categories WHERE id = $1 AND organization_id = $2', [id, req.house.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Shopping List (scoped by house) ---

// GET /api/shopping-items
app.get('/api/shopping-items', requireAuth, requireHouse, async (req, res) => {
  try {
    // Auto-archivar comprados con mas de SHOPPING_AUTO_ARCHIVE_DAYS dias (lazy).
    await pool.query(
      `UPDATE shopping_items
       SET archived_at = NOW()
       WHERE organization_id = $1
         AND is_purchased = true
         AND archived_at IS NULL
         AND purchased_at IS NOT NULL
         AND purchased_at < NOW() - ($2 || ' days')::INTERVAL`,
      [req.house.id, String(SHOPPING_AUTO_ARCHIVE_DAYS)]
    )

    const { rows } = await pool.query(`
      SELECT si.*, sc.name as category_name, sc.emoji as category_emoji
      FROM shopping_items si
      LEFT JOIN shopping_categories sc ON si.category_id = sc.id
      WHERE si.organization_id = $1 AND si.archived_at IS NULL
      ORDER BY si.is_purchased, sc.sort_order NULLS LAST, si.created_at DESC
    `, [req.house.id])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/shopping-items
app.post('/api/shopping-items', requireAuth, requireHouse, async (req, res) => {
  try {
    const { name, note, category_id } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await pool.query(
      'INSERT INTO shopping_items (name, note, added_by, category_id, organization_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name.trim(), note?.trim() || null, req.user.name || null, category_id || null, req.house.id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/shopping-items/:id
app.patch('/api/shopping-items/:id', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    const fields = { ...req.body }
    delete fields.organization_id
    delete fields.id

    // Auto-sync purchased_at / archived_at cuando cambia is_purchased.
    // El servidor manda; ignora cualquier purchased_at/archived_at del cliente
    // en este caso para evitar inconsistencias.
    if (Object.prototype.hasOwnProperty.call(fields, 'is_purchased')) {
      if (fields.is_purchased) {
        fields.purchased_at = new Date()
      } else {
        fields.purchased_at = null
        fields.archived_at = null
      }
    }

    const built = buildPatchUpdate('shopping_items', fields, SHOPPING_ITEM_UPDATABLE_COLUMNS)
    if (built.error) return res.status(400).json({ error: built.error })

    const { rows } = await pool.query(built.sql, [id, req.house.id, ...built.values])
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/shopping-items/clear-purchased
// Archiva en lugar de borrar: conserva historial para recomendaciones (Fase 2).
app.delete('/api/shopping-items/clear-purchased', requireAuth, requireHouse, async (req, res) => {
  try {
    // Items sin purchased_at (legacy) reciben uno antes de archivar.
    await pool.query(
      `UPDATE shopping_items
       SET purchased_at = COALESCE(purchased_at, NOW()),
           archived_at = NOW()
       WHERE is_purchased = true
         AND archived_at IS NULL
         AND organization_id = $1`,
      [req.house.id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/shopping-items/history
// Items archivados, mas recientes primero. Util para vista "Historial".
app.get('/api/shopping-items/history', requireAuth, requireHouse, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 500)
    const { rows } = await pool.query(`
      SELECT si.*, sc.name as category_name, sc.emoji as category_emoji
      FROM shopping_items si
      LEFT JOIN shopping_categories sc ON si.category_id = sc.id
      WHERE si.organization_id = $1 AND si.archived_at IS NOT NULL
      ORDER BY si.archived_at DESC, si.purchased_at DESC NULLS LAST
      LIMIT $2
    `, [req.house.id, limit])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/shopping-items/recommendations
// Sugiere proximas compras analizando periodicidad del historial archivado.
app.get('/api/shopping-items/recommendations', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows: archived } = await pool.query(`
      SELECT si.id, si.name, si.category_id, si.purchased_at,
             sc.name as category_name, sc.emoji as category_emoji
      FROM shopping_items si
      LEFT JOIN shopping_categories sc ON si.category_id = sc.id
      WHERE si.organization_id = $1
        AND si.archived_at IS NOT NULL
        AND si.purchased_at IS NOT NULL
      ORDER BY si.purchased_at DESC
    `, [req.house.id])

    const { rows: active } = await pool.query(
      `SELECT name FROM shopping_items
       WHERE organization_id = $1 AND archived_at IS NULL`,
      [req.house.id]
    )

    const recommendations = buildRecommendations(archived, active)
    res.json(recommendations)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/shopping-items/:id
app.delete('/api/shopping-items/:id', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM shopping_items WHERE id = $1 AND organization_id = $2', [id, req.house.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Plants (scoped by house) ---

// GET /api/plants
app.get('/api/plants', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM plants WHERE organization_id = $1 ORDER BY name',
      [req.house.id]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/plants
app.post('/api/plants', requireAuth, requireHouse, async (req, res) => {
  try {
    const { name, notes, watering_frequency_days } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const freq = Math.max(1, parseInt(watering_frequency_days) || 7)
    const { rows } = await pool.query(
      `INSERT INTO plants (name, notes, watering_frequency_days, organization_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), notes?.trim() || null, freq, req.house.id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/plants/:id — el formulario siempre envia los 3 campos, por eso updates completos.
app.patch('/api/plants/:id', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    const { name, notes, watering_frequency_days } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const freq = Math.max(1, parseInt(watering_frequency_days) || 7)

    const { rows } = await pool.query(
      `UPDATE plants SET name = $3, notes = $4, watering_frequency_days = $5
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, req.house.id, name.trim(), notes?.trim() || null, freq]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Plant not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/plants/:id
app.delete('/api/plants/:id', requireAuth, requireHouse, async (req, res) => {
  try {
    const { id } = req.params
    const { rowCount } = await pool.query(
      'DELETE FROM plants WHERE id = $1 AND organization_id = $2',
      [id, req.house.id]
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Plant not found' })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/plants/:id/water — registra riego y actualiza last_watered_at
app.post('/api/plants/:id/water', requireAuth, requireHouse, async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { rows: plantRows } = await client.query(
      'SELECT id, name FROM plants WHERE id = $1 AND organization_id = $2',
      [id, req.house.id]
    )
    if (plantRows.length === 0) return res.status(404).json({ error: 'Plant not found' })

    await client.query('BEGIN')
    await client.query(
      'INSERT INTO plant_watering_history (plant_id, watered_at, watered_by, user_id) VALUES ($1, NOW(), $2, $3)',
      [id, req.user.name || null, req.user.id]
    )
    const { rows } = await client.query(
      'UPDATE plants SET last_watered_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *',
      [id, req.house.id]
    )
    await client.query('COMMIT')

    sendPushToHouse(req.house.id, {
      title: 'Planta regada',
      body: `${req.user.name || 'Alguien'} rego: ${plantRows[0].name}`,
      tag: 'plant-watered',
    })

    res.json(rows[0])
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// GET /api/plants/:id/history
app.get('/api/plants/:id/history', requireAuth, requireHouse, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const { rows } = await pool.query(`
      SELECT h.* FROM plant_watering_history h
      JOIN plants p ON h.plant_id = p.id
      WHERE h.plant_id = $1 AND p.organization_id = $2
      ORDER BY h.watered_at DESC LIMIT $3
    `, [req.params.id, req.house.id, limit])
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Stats ---

// GET /api/stats/participation?period=week|month|all
app.get('/api/stats/participation', requireAuth, requireHouse, async (req, res) => {
  try {
    const period = req.query.period || 'month'
    let dateFilter = ''
    if (period === 'week') {
      dateFilter = "AND c.completed_at >= NOW() - INTERVAL '7 days'"
    } else if (period === 'month') {
      dateFilter = "AND c.completed_at >= NOW() - INTERVAL '30 days'"
    }

    // Per-member completion counts
    const { rows: memberStats } = await pool.query(`
      SELECT
        c.user_id,
        COALESCE(c.completed_by, 'Desconocido') as name,
        COALESCE(p.avatar, '🧑') as avatar,
        COALESCE(p.color, '#6a9960') as color,
        COUNT(*) as completions
      FROM completions c
      JOIN tasks t ON c.task_id = t.id
      LEFT JOIN house_member_profiles p ON p.user_id = c.user_id AND p.organization_id = t.organization_id
      WHERE t.organization_id = $1 ${dateFilter}
      GROUP BY c.user_id, c.completed_by, p.avatar, p.color
      ORDER BY completions DESC
    `, [req.house.id])

    // Total completions
    const total = memberStats.reduce((sum, m) => sum + parseInt(m.completions), 0)

    // Daily completions for the period (for chart)
    let chartDays = period === 'week' ? 7 : period === 'month' ? 30 : 90
    const { rows: daily } = await pool.query(`
      SELECT
        DATE(c.completed_at) as date,
        COUNT(*) as count
      FROM completions c
      JOIN tasks t ON c.task_id = t.id
      WHERE t.organization_id = $1
        AND c.completed_at >= NOW() - INTERVAL '${chartDays} days'
      GROUP BY DATE(c.completed_at)
      ORDER BY date
    `, [req.house.id])

    // Top tasks (most completed)
    const { rows: topTasks } = await pool.query(`
      SELECT
        t.name,
        COUNT(*) as completions
      FROM completions c
      JOIN tasks t ON c.task_id = t.id
      WHERE t.organization_id = $1 ${dateFilter}
      GROUP BY t.name
      ORDER BY completions DESC
      LIMIT 5
    `, [req.house.id])

    res.json({
      members: memberStats.map(m => ({
        userId: m.user_id,
        name: m.name,
        avatar: m.avatar,
        color: m.color,
        completions: parseInt(m.completions),
        percentage: total > 0 ? Math.round((parseInt(m.completions) / total) * 100) : 0,
      })),
      total,
      daily: daily.map(d => ({ date: d.date, count: parseInt(d.count) })),
      topTasks: topTasks.map(t => ({ name: t.name, completions: parseInt(t.completions) })),
      period,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Push Notifications ---

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@casalimpia.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// GET /api/push/vapid-key
app.get('/api/push/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return res.status(503).json({ error: 'Push notifications no configuradas' })
  res.json({ publicKey: key })
})

// POST /api/push/subscribe
app.post('/api/push/subscribe', requireAuth, requireHouse, async (req, res) => {
  try {
    const { subscription } = req.body
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription invalida' })
    }

    await pool.query(`
      INSERT INTO push_subscriptions (user_id, organization_id, endpoint, keys_p256dh, keys_auth)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        organization_id = EXCLUDED.organization_id,
        keys_p256dh = EXCLUDED.keys_p256dh,
        keys_auth = EXCLUDED.keys_auth,
        updated_at = NOW()
    `, [req.user.id, req.house.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth])

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/push/subscribe
app.delete('/api/push/subscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ error: 'Endpoint requerido' })
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/push/status
app.get('/api/push/status', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM push_subscriptions WHERE user_id = $1 AND organization_id = $2 LIMIT 1',
      [req.user.id, req.house.id]
    )
    res.json({ subscribed: rows.length > 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Internal: send push to all subscribers of a house
async function sendPushToHouse(organizationId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return

  try {
    const { rows } = await pool.query(
      'SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE organization_id = $1',
      [organizationId]
    )

    const promises = rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
          JSON.stringify(payload)
        )
      } catch (err) {
        // Remove expired subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint])
        }
      }
    })

    await Promise.allSettled(promises)
  } catch (err) {
    console.error('Push notification error:', err.message)
  }
}

// --- Auto-migrate ---
async function migrate() {
  try {
    // Create base tables if missing (for fresh installs without init.sql)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        frequency_type  TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'biweekly', 'monthly')),
        frequency_value INTEGER NOT NULL DEFAULT 1,
        is_active   BOOLEAN NOT NULL DEFAULT true,
        product_name  TEXT,
        product_image TEXT,
        organization_id TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS completions (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_by TEXT,
        user_id TEXT
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_completions_task_id ON completions(task_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON completions(completed_at DESC)')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name            TEXT NOT NULL,
        category        TEXT NOT NULL DEFAULT 'general',
        is_out_of_stock BOOLEAN NOT NULL DEFAULT false,
        reminder_frequency_days INTEGER NOT NULL DEFAULT 30,
        last_purchased_at TIMESTAMPTZ,
        organization_id TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_out_of_stock ON products(is_out_of_stock)')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_categories (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name            TEXT NOT NULL,
        emoji           TEXT NOT NULL DEFAULT '📦',
        sort_order      INTEGER NOT NULL DEFAULT 0,
        organization_id TEXT NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_categories_org ON shopping_categories(organization_id)')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_items (
        id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name         TEXT NOT NULL,
        note         TEXT,
        added_by     TEXT,
        is_purchased BOOLEAN NOT NULL DEFAULT false,
        category_id  UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
        organization_id TEXT,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON shopping_items(is_purchased)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category_id)')

    // Migrations for existing installations

    // Add completed_by to completions if missing
    await addColumnIfMissing('completions', 'completed_by', 'TEXT')
    // Add product_name to tasks if missing
    await addColumnIfMissing('tasks', 'product_name', 'TEXT')
    // Add product_image to tasks if missing
    await addColumnIfMissing('tasks', 'product_image', 'TEXT')
    // Reset de aparición sin borrar historial
    await addColumnIfMissing('tasks', 'last_reset_at', 'TIMESTAMPTZ')
    // Unidades compradas por vez + timestamp de agotado para detectar consumo acelerado
    await addColumnIfMissing('products', 'units', 'INTEGER NOT NULL DEFAULT 1')
    await addColumnIfMissing('products', 'last_out_of_stock_at', 'TIMESTAMPTZ')

    // Multi-tenant columns
    await addColumnIfMissing('tasks', 'organization_id', 'TEXT')
    await addColumnIfMissing('products', 'organization_id', 'TEXT')
    await addColumnIfMissing('shopping_items', 'organization_id', 'TEXT')
    await addColumnIfMissing('completions', 'user_id', 'TEXT')

    await pool.query('CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_org ON shopping_items(organization_id)')

    // Shopping categories support
    await addColumnIfMissing('shopping_items', 'category_id', 'UUID REFERENCES shopping_categories(id) ON DELETE SET NULL')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category_id)')

    // Pantalla de inicio personalizable por usuario en cada casa
    await addColumnIfMissing('house_member_profiles', 'home_screen', "TEXT NOT NULL DEFAULT 'tasks'")

    // Rol externo (personal de aseo): flag a nivel de app sobre el perfil del miembro
    await addColumnIfMissing('house_member_profiles', 'member_type', "TEXT NOT NULL DEFAULT 'regular'")

    // Archivado de compras + historial para recomendaciones (Fase 2)
    await addColumnIfMissing('shopping_items', 'purchased_at', 'TIMESTAMPTZ')
    await addColumnIfMissing('shopping_items', 'archived_at', 'TIMESTAMPTZ')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_archived ON shopping_items(archived_at)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased_at ON shopping_items(purchased_at DESC)')

    // House member profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS house_member_profiles (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id         TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        avatar          TEXT NOT NULL DEFAULT '🧑',
        color           TEXT NOT NULL DEFAULT '#6a9960',
        home_screen     TEXT NOT NULL DEFAULT 'tasks',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, organization_id)
      )
    `)

    // Visitas del personal externo (marca de llegada -> fecha que heredan sus tareas)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        organization_id TEXT NOT NULL,
        user_id         TEXT NOT NULL,
        visited_on      DATE NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_visits_org_user ON visits(organization_id, user_id, created_at DESC)')

    // Super admins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id    TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Plants tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plants (
        id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name                     TEXT NOT NULL,
        notes                    TEXT,
        watering_frequency_days  INTEGER NOT NULL DEFAULT 7,
        last_watered_at          TIMESTAMPTZ,
        organization_id          TEXT NOT NULL,
        created_at               TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_plants_org ON plants(organization_id)')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plant_watering_history (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        plant_id    UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
        watered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        watered_by  TEXT,
        user_id     TEXT
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_plant_watering_plant_id ON plant_watering_history(plant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_plant_watering_at ON plant_watering_history(watered_at DESC)')

    // Push subscriptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id         TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        endpoint        TEXT NOT NULL UNIQUE,
        keys_p256dh     TEXT NOT NULL,
        keys_auth       TEXT NOT NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_push_subs_org ON push_subscriptions(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)')

    console.log('Migrations complete')
  } catch (err) {
    console.error('Migration error:', err.message)
  }
}

async function addColumnIfMissing(table, column, type) {
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = $1 AND column_name = $2
  `, [table, column])
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
    console.log(`Migration: added ${column} column to ${table}`)
  }
}

const PORT = process.env.PORT || 3001
migrate().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Casa Limpia API running on port ${PORT}`)
  })
})
