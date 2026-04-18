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
    last_reset_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS completions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_by TEXT,
    user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_completions_task_id ON completions(task_id);
CREATE INDEX IF NOT EXISTS idx_completions_completed_at ON completions(completed_at DESC);

CREATE TABLE IF NOT EXISTS products (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL DEFAULT 'general',
    is_out_of_stock BOOLEAN NOT NULL DEFAULT false,
    reminder_frequency_days INTEGER NOT NULL DEFAULT 30,
    last_purchased_at TIMESTAMPTZ,
    organization_id TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_out_of_stock ON products(is_out_of_stock);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);

CREATE TABLE IF NOT EXISTS shopping_categories (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name            TEXT NOT NULL,
    emoji           TEXT NOT NULL DEFAULT '📦',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    organization_id TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_categories_org ON shopping_categories(organization_id);

CREATE TABLE IF NOT EXISTS shopping_items (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    note        TEXT,
    added_by    TEXT,
    is_purchased BOOLEAN NOT NULL DEFAULT false,
    category_id UUID REFERENCES shopping_categories(id) ON DELETE SET NULL,
    organization_id TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_purchased ON shopping_items(is_purchased);
CREATE INDEX IF NOT EXISTS idx_shopping_items_org ON shopping_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category_id);

CREATE TABLE IF NOT EXISTS house_member_profiles (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    avatar          TEXT NOT NULL DEFAULT '🧑',
    color           TEXT NOT NULL DEFAULT '#6a9960',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS super_admins (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
