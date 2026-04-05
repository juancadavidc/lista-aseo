/**
 * Migration script: moves data from the old single-tenant casalimpia DB
 * to the new multi-tenant bd-myhome DB.
 *
 * Usage:
 *   node migrate-legacy-data.js <organization_id>
 *
 * If no organization_id is provided, it creates a new organization called
 * "Casa Limpia" and assigns all data to it.
 *
 * Legacy profiles (Sara, Juanda, Paula, Dani) are stored in a
 * legacy_profiles JSON column on the organization for reference only.
 * They are NOT linked to any user account — new users register with Google.
 */
import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

// Old DB (single-tenant)
const oldPool = new Pool({
  host: '104.131.41.153',
  port: 5433,
  user: 'casalimpia',
  password: 'casalimpia',
  database: 'casalimpia',
})

// New DB (multi-tenant)
const newPool = new Pool({
  host: process.env.DB_HOST || '104.131.41.153',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bd-myhome',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

async function ensureTablesExist() {
  // Run the same migrations as the server
  await newPool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'biweekly', 'monthly')),
      frequency_value INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT true,
      product_name TEXT,
      product_image TEXT,
      organization_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await newPool.query(`
    CREATE TABLE IF NOT EXISTS completions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_by TEXT,
      user_id TEXT
    )
  `)

  await newPool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      is_out_of_stock BOOLEAN NOT NULL DEFAULT false,
      reminder_frequency_days INTEGER NOT NULL DEFAULT 30,
      last_purchased_at TIMESTAMPTZ,
      organization_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await newPool.query(`
    CREATE TABLE IF NOT EXISTS shopping_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      note TEXT,
      added_by TEXT,
      is_purchased BOOLEAN NOT NULL DEFAULT false,
      organization_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await newPool.query(`
    CREATE TABLE IF NOT EXISTS house_member_profiles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '\u{1F9D1}',
      color TEXT NOT NULL DEFAULT '#6a9960',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, organization_id)
    )
  `)

  // Indexes
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_completions_task_id ON completions(task_id)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON completions(completed_at DESC)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_products_out_of_stock ON products(is_out_of_stock)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON shopping_items(is_purchased)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id)')
  await newPool.query('CREATE INDEX IF NOT EXISTS idx_shopping_items_org ON shopping_items(organization_id)')

  console.log('Tables ensured in new DB')
}

async function getOrCreateOrganization(orgId) {
  if (orgId) {
    const { rows } = await newPool.query('SELECT id FROM organization WHERE id = $1', [orgId])
    if (rows.length === 0) {
      console.error(`Organization ${orgId} not found in new DB`)
      process.exit(1)
    }
    return orgId
  }

  // Check if Better Auth tables exist — they're created by Better Auth on first request
  // We'll create the organization table manually if needed
  await newPool.query(`
    CREATE TABLE IF NOT EXISTS organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      logo TEXT,
      metadata TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Check if "casa-limpia" org already exists
  const { rows: existing } = await newPool.query("SELECT id FROM organization WHERE slug = 'casa-limpia'")
  if (existing.length > 0) {
    console.log(`Organization "casa-limpia" already exists: ${existing[0].id}`)
    return existing[0].id
  }

  // Create it
  const id = crypto.randomUUID()
  await newPool.query(
    `INSERT INTO organization (id, name, slug) VALUES ($1, $2, $3)`,
    [id, 'Casa Limpia', 'casa-limpia']
  )
  console.log(`Created organization "Casa Limpia" with id: ${id}`)
  return id
}

async function migrateTasks(orgId) {
  const { rows: tasks } = await oldPool.query('SELECT * FROM tasks ORDER BY created_at')
  console.log(`Migrating ${tasks.length} tasks...`)

  for (const t of tasks) {
    await newPool.query(
      `INSERT INTO tasks (id, name, description, frequency_type, frequency_value, is_active, product_name, product_image, organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [t.id, t.name, t.description, t.frequency_type, t.frequency_value, t.is_active, t.product_name, t.product_image, orgId, t.created_at]
    )
  }
  console.log(`  ${tasks.length} tasks migrated`)
}

async function migrateCompletions() {
  const { rows: completions } = await oldPool.query('SELECT * FROM completions ORDER BY completed_at')
  console.log(`Migrating ${completions.length} completions...`)

  for (const c of completions) {
    await newPool.query(
      `INSERT INTO completions (id, task_id, completed_at, completed_by, user_id)
       VALUES ($1, $2, $3, $4, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, c.task_id, c.completed_at, c.completed_by]
    )
  }
  console.log(`  ${completions.length} completions migrated (legacy names preserved in completed_by)`)
}

async function migrateProducts(orgId) {
  const { rows: products } = await oldPool.query('SELECT * FROM products ORDER BY created_at')
  console.log(`Migrating ${products.length} products...`)

  for (const p of products) {
    await newPool.query(
      `INSERT INTO products (id, name, category, is_out_of_stock, reminder_frequency_days, last_purchased_at, organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.category, p.is_out_of_stock, p.reminder_frequency_days, p.last_purchased_at, orgId, p.created_at]
    )
  }
  console.log(`  ${products.length} products migrated`)
}

async function migrateShoppingItems(orgId) {
  const { rows: items } = await oldPool.query('SELECT * FROM shopping_items ORDER BY created_at')
  console.log(`Migrating ${items.length} shopping items...`)

  for (const s of items) {
    await newPool.query(
      `INSERT INTO shopping_items (id, name, note, added_by, is_purchased, organization_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.name, s.note, s.added_by, s.is_purchased, orgId, s.created_at]
    )
  }
  console.log(`  ${items.length} shopping items migrated`)
}

async function storeLegacyProfiles(orgId) {
  const { rows: profiles } = await oldPool.query('SELECT * FROM profiles ORDER BY created_at')
  console.log(`Storing ${profiles.length} legacy profiles as metadata...`)

  // Store legacy profiles as JSON metadata on the organization
  const metadata = JSON.stringify({
    legacy_profiles: profiles.map(p => ({
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      created_at: p.created_at,
    }))
  })

  await newPool.query(
    'UPDATE organization SET metadata = $1 WHERE id = $2',
    [metadata, orgId]
  )
  console.log(`  Legacy profiles stored: ${profiles.map(p => `${p.avatar} ${p.name}`).join(', ')}`)
  console.log('  These are informational only — users must register with Google to access the house')
}

async function main() {
  const orgIdArg = process.argv[2] || null

  try {
    console.log('=== Casa Limpia Legacy Data Migration ===\n')

    // Test connections
    await oldPool.query('SELECT 1')
    console.log('Connected to old DB (casalimpia:5433)')
    await newPool.query('SELECT 1')
    console.log('Connected to new DB (bd-myhome:5432)\n')

    await ensureTablesExist()
    const orgId = await getOrCreateOrganization(orgIdArg)
    console.log(`\nTarget organization: ${orgId}\n`)

    await migrateTasks(orgId)
    await migrateCompletions()
    await migrateProducts(orgId)
    await migrateShoppingItems(orgId)
    await storeLegacyProfiles(orgId)

    console.log('\n=== Migration complete! ===')
    console.log(`Organization ID: ${orgId}`)
    console.log('Next steps:')
    console.log('  1. Configure Google OAuth credentials in .env')
    console.log('  2. Deploy the app')
    console.log('  3. Users register with Google and get invited to the house')
    console.log('  4. Legacy completion history (Juanda, Paula, etc.) is preserved as text')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await oldPool.end()
    await newPool.end()
  }
}

main()
