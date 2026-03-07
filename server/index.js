import express from 'express'
import cors from 'cors'
import pg from 'pg'

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
    const { name, description, frequency_type, frequency_value, is_active } = req.body
    const { rows } = await pool.query(
      `INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, frequency_type, frequency_value, is_active ?? true]
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
