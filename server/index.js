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
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
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

// --- Auth Middleware ---

async function requireAuth(req, res, next) {
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

async function requireHouse(req, res, next) {
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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.house.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion' })
    }
    next()
  }
}

// --- Super Admin Middleware ---

async function requireSuperAdmin(req, res, next) {
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
             COALESCE(p.color, '#6a9960') as color
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

// GET /api/houses/profile - get my profile for active house
app.get('/api/houses/profile', requireAuth, requireHouse, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM house_member_profiles WHERE user_id = $1 AND organization_id = $2',
      [req.user.id, req.house.id]
    )
    if (rows.length === 0) {
      return res.json({ user_id: req.user.id, organization_id: req.house.id, avatar: '🧑', color: '#6a9960' })
    }
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/houses/profile - update my avatar/color for active house
app.put('/api/houses/profile', requireAuth, requireHouse, async (req, res) => {
  try {
    const { avatar, color } = req.body
    const { rows } = await pool.query(`
      INSERT INTO house_member_profiles (user_id, organization_id, avatar, color)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET avatar = EXCLUDED.avatar, color = EXCLUDED.color
      RETURNING *
    `, [req.user.id, req.house.id, avatar || '🧑', color || '#6a9960'])
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/houses/seed - insert example tasks and products for a new house
app.post('/api/houses/seed', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const orgId = req.house.id

    // Check if house already has data
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) as c FROM tasks WHERE organization_id = $1', [orgId]
    )
    if (parseInt(existing[0].c) > 0) {
      return res.status(400).json({ error: 'Esta casa ya tiene datos' })
    }

    // Seed tasks
    await pool.query(`
      INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active, organization_id) VALUES
        ('Barrer la cocina',      'Incluir debajo de la nevera',             'daily',    1,  true, $1),
        ('Fregar el suelo',       'Cocina, bano y pasillo',                  'daily',    2,  true, $1),
        ('Limpiar el bano',       'Lavabo, ducha, inodoro y espejo',         'weekly',   7,  true, $1),
        ('Pasar la aspiradora',   'Sala y dormitorios',                      'weekly',   7,  true, $1),
        ('Limpiar microondas',    'Interior y exterior',                     'weekly',   7,  true, $1),
        ('Cambiar sabanas',       'Todas las camas',                         'biweekly', 14, true, $1),
        ('Limpiar nevera',        'Sacar todo y limpiar estantes',           'monthly',  30, true, $1),
        ('Lavar ventanas',        'Cristales interiores y marcos',           'monthly',  30, true, $1),
        ('Limpiar horno',         'Rejillas y interior',                     'monthly',  30, true, $1),
        ('Desempolvar muebles',   'Estanterias, cuadros y rincones altos',  'weekly',   7,  true, $1)
    `, [orgId])

    // Seed products
    await pool.query(`
      INSERT INTO products (name, category, reminder_frequency_days, is_out_of_stock, organization_id) VALUES
        ('Jabon lavavajillas',    'limpieza',   30, false, $1),
        ('Lejia',                 'limpieza',   30, false, $1),
        ('Fregasuelos',           'limpieza',   30, false, $1),
        ('Limpiacristales',       'limpieza',   60, false, $1),
        ('Esponjas',              'limpieza',   30, false, $1),
        ('Bolsas de basura',      'limpieza',   14, false, $1),
        ('Papel higienico',       'bano',       14, false, $1),
        ('Jabon de manos',        'bano',       30, false, $1),
        ('Ambientador',           'bano',       30, false, $1),
        ('Detergente ropa',       'lavanderia', 30, false, $1),
        ('Suavizante',            'lavanderia', 30, false, $1)
    `, [orgId])

    res.json({ ok: true })
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
          OR NOW() >= c.last_completed_at + (t.frequency_value * INTERVAL '1 day')
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
app.post('/api/tasks', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
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
    const fields = req.body
    const keys = Object.keys(fields).filter(k => k !== 'organization_id')
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 3}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, req.house.id, ...values]
    )
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
      'SELECT id FROM tasks WHERE id = $1 AND organization_id = $2', [task_id, req.house.id]
    )
    if (taskCheck.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' })

    const { rows } = await pool.query(
      'INSERT INTO completions (task_id, completed_at, completed_by, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [task_id, completed_at || new Date().toISOString(), req.user.name || null, req.user.id]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/completions?task_id=xxx
app.delete('/api/completions', requireAuth, requireHouse, requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { task_id } = req.query
    if (!task_id) return res.status(400).json({ error: 'task_id required' })
    // Verify task belongs to house
    const { rows: taskCheck } = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND organization_id = $2', [task_id, req.house.id]
    )
    if (taskCheck.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' })

    await pool.query('DELETE FROM completions WHERE task_id = $1', [task_id])
    res.json({ ok: true })
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
    const { name, category, reminder_frequency_days, is_out_of_stock } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await pool.query(
      `INSERT INTO products (name, category, reminder_frequency_days, is_out_of_stock, organization_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), category || 'general', reminder_frequency_days || 30, is_out_of_stock ?? false, req.house.id]
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
    const fields = req.body
    const keys = Object.keys(fields).filter(k => k !== 'organization_id')
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 3}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, req.house.id, ...values]
    )
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
      `UPDATE products SET last_purchased_at = NOW(), is_out_of_stock = false WHERE id = $1 AND organization_id = $2 RETURNING *`,
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
    const fields = req.body
    const keys = Object.keys(fields).filter(k => k !== 'organization_id' && k !== 'id')
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 3}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE shopping_categories SET ${setClauses.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, req.house.id, ...values]
    )
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
    const { rows } = await pool.query(`
      SELECT si.*, sc.name as category_name, sc.emoji as category_emoji
      FROM shopping_items si
      LEFT JOIN shopping_categories sc ON si.category_id = sc.id
      WHERE si.organization_id = $1
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
    const fields = req.body
    const keys = Object.keys(fields).filter(k => k !== 'organization_id')
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 3}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE shopping_items SET ${setClauses.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, req.house.id, ...values]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/shopping-items/clear-purchased
app.delete('/api/shopping-items/clear-purchased', requireAuth, requireHouse, async (req, res) => {
  try {
    await pool.query('DELETE FROM shopping_items WHERE is_purchased = true AND organization_id = $1', [req.house.id])
    res.json({ ok: true })
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

    // House member profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS house_member_profiles (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id         TEXT NOT NULL,
        organization_id TEXT NOT NULL,
        avatar          TEXT NOT NULL DEFAULT '🧑',
        color           TEXT NOT NULL DEFAULT '#6a9960',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, organization_id)
      )
    `)

    // Super admins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admins (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id    TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

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
