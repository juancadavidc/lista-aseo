import express from 'express'
import cors from 'cors'
import pg from 'pg'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

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
    else cb(new Error('Solo se permiten imágenes .jpg, .png, .webp'))
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

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/uploads', express.static(UPLOADS_DIR))

// --- Profiles ---

// GET /api/profiles
app.get('/api/profiles', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM profiles ORDER BY created_at')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/profiles
app.post('/api/profiles', async (req, res) => {
  try {
    const { name, avatar, color } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await pool.query(
      'INSERT INTO profiles (name, avatar, color) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), avatar || '🧑', color || '#6a9960']
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/profiles/:id
app.patch('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params
    const fields = req.body
    const keys = Object.keys(fields)
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE profiles SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Profile not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/profiles/:id
app.delete('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM profiles WHERE id = $1', [id])
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

// POST /api/uploads - upload a product image
app.post('/api/uploads', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' })
  res.json({ filename: req.file.filename })
})

// DELETE /api/uploads/:filename - delete an uploaded image
app.delete('/api/uploads/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename)
  const filePath = path.join(UPLOADS_DIR, safeName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
  res.json({ ok: true })
})

// GET /api/tasks - all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true'
    let query = 'SELECT * FROM tasks'
    if (activeOnly) query += ' WHERE is_active = true'
    query += ' ORDER BY name'
    const { rows } = await pool.query(query)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tasks - create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { name, description, frequency_type, frequency_value, is_active, product_name, product_image } = req.body
    const { rows } = await pool.query(
      `INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active, product_name, product_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, frequency_type, frequency_value, is_active ?? true, product_name || null, product_image || null]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/tasks/:id - update task
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const fields = req.body
    const keys = Object.keys(fields)
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Task not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/tasks/:id - delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { rows: taskRows } = await pool.query('SELECT product_image FROM tasks WHERE id = $1', [id])
    if (taskRows.length > 0 && taskRows[0].product_image) {
      const filePath = path.join(UPLOADS_DIR, taskRows[0].product_image)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    await pool.query('DELETE FROM completions WHERE task_id = $1', [id])
    await pool.query('DELETE FROM tasks WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/completions - all completions (for pending calc)
app.get('/api/completions', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT task_id, completed_at, completed_by FROM completions ORDER BY completed_at DESC'
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/completions - mark task as completed
app.post('/api/completions', async (req, res) => {
  try {
    const { task_id, completed_at, completed_by } = req.body
    const { rows } = await pool.query(
      'INSERT INTO completions (task_id, completed_at, completed_by) VALUES ($1, $2, $3) RETURNING *',
      [task_id, completed_at || new Date().toISOString(), completed_by || null]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/completions?task_id=xxx - reset task (delete all completions)
app.delete('/api/completions', async (req, res) => {
  try {
    const { task_id } = req.query
    if (!task_id) return res.status(400).json({ error: 'task_id required' })
    await pool.query('DELETE FROM completions WHERE task_id = $1', [task_id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/completions/:taskId/history - task history
app.get('/api/completions/:taskId/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const { rows } = await pool.query(
      'SELECT * FROM completions WHERE task_id = $1 ORDER BY completed_at DESC LIMIT $2',
      [req.params.taskId, limit]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Products ---

// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const category = req.query.category
    const outOfStock = req.query.out_of_stock
    let query = 'SELECT * FROM products'
    const conditions = []
    const params = []

    if (category) {
      params.push(category)
      conditions.push(`category = $${params.length}`)
    }
    if (outOfStock === 'true') {
      conditions.push('is_out_of_stock = true')
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ')
    query += ' ORDER BY is_out_of_stock DESC, name'

    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, reminder_frequency_days, is_out_of_stock } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await pool.query(
      `INSERT INTO products (name, category, reminder_frequency_days, is_out_of_stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), category || 'general', reminder_frequency_days || 30, is_out_of_stock ?? false]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/products/:id
app.patch('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    const fields = req.body
    const keys = Object.keys(fields)
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/products/:id/purchase - mark as purchased
app.post('/api/products/:id/purchase', async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      `UPDATE products SET last_purchased_at = NOW(), is_out_of_stock = false WHERE id = $1 RETURNING *`,
      [id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM products WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Shopping List ---

// GET /api/shopping-items
app.get('/api/shopping-items', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM shopping_items ORDER BY is_purchased, created_at DESC')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/shopping-items
app.post('/api/shopping-items', async (req, res) => {
  try {
    const { name, note, added_by } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
    const { rows } = await pool.query(
      'INSERT INTO shopping_items (name, note, added_by) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), note?.trim() || null, added_by || null]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/shopping-items/:id
app.patch('/api/shopping-items/:id', async (req, res) => {
  try {
    const { id } = req.params
    const fields = req.body
    const keys = Object.keys(fields)
    if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' })

    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`)
    const values = keys.map(k => fields[k])

    const { rows } = await pool.query(
      `UPDATE shopping_items SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      [id, ...values]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' })
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/shopping-items/clear-purchased
app.delete('/api/shopping-items/clear-purchased', async (req, res) => {
  try {
    await pool.query('DELETE FROM shopping_items WHERE is_purchased = true')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/shopping-items/:id
app.delete('/api/shopping-items/:id', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM shopping_items WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Auto-migrate
async function migrate() {
  try {
    // Add completed_by column if missing
    const { rows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'completions' AND column_name = 'completed_by'
    `)
    if (rows.length === 0) {
      await pool.query('ALTER TABLE completions ADD COLUMN completed_by TEXT')
      console.log('Migration: added completed_by column to completions')
    }

    // Add product_name column if missing
    const { rows: pnRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tasks' AND column_name = 'product_name'
    `)
    if (pnRows.length === 0) {
      await pool.query('ALTER TABLE tasks ADD COLUMN product_name TEXT')
      console.log('Migration: added product_name column to tasks')
    }

    // Add product_image column if missing
    const { rows: piRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'tasks' AND column_name = 'product_image'
    `)
    if (piRows.length === 0) {
      await pool.query('ALTER TABLE tasks ADD COLUMN product_image TEXT')
      console.log('Migration: added product_image column to tasks')
    }

    // Create profiles table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name        TEXT NOT NULL,
        avatar      TEXT NOT NULL DEFAULT '🧑',
        color       TEXT NOT NULL DEFAULT '#6a9960',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    // Create products table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name            TEXT NOT NULL,
        category        TEXT NOT NULL DEFAULT 'general',
        is_out_of_stock BOOLEAN NOT NULL DEFAULT false,
        reminder_frequency_days INTEGER NOT NULL DEFAULT 30,
        last_purchased_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_out_of_stock ON products(is_out_of_stock)')

    // Create shopping_items table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shopping_items (
        id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name         TEXT NOT NULL,
        note         TEXT,
        added_by     TEXT,
        is_purchased BOOLEAN NOT NULL DEFAULT false,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON shopping_items(is_purchased)')
  } catch (err) {
    console.error('Migration error:', err.message)
  }
}

const PORT = process.env.PORT || 3001
migrate().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Casa Limpia API running on port ${PORT}`)
  })
})
