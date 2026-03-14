CREATE TABLE IF NOT EXISTS profiles (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    avatar      TEXT NOT NULL DEFAULT '🧑',
    color       TEXT NOT NULL DEFAULT '#6a9960',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    frequency_type  TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'biweekly', 'monthly')),
    frequency_value INTEGER NOT NULL DEFAULT 1,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    product_name  TEXT,
    product_image TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS completions (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_by TEXT
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
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_out_of_stock ON products(is_out_of_stock);

-- Productos de ejemplo
INSERT INTO products (name, category, reminder_frequency_days, is_out_of_stock) VALUES
    ('Jabon lavavajillas',    'limpieza',   30, false),
    ('Lejia',                 'limpieza',   30, false),
    ('Fregasuelos',           'limpieza',   30, false),
    ('Limpiacristales',       'limpieza',   60, false),
    ('Esponjas',              'limpieza',   30, false),
    ('Bolsas de basura',      'limpieza',   14, false),
    ('Papel higienico',       'bano',       14, false),
    ('Jabon de manos',        'bano',       30, false),
    ('Ambientador',           'bano',       30, false),
    ('Detergente ropa',       'lavanderia', 30, false),
    ('Suavizante',            'lavanderia', 30, false)
ON CONFLICT DO NOTHING;

-- Datos de ejemplo
INSERT INTO tasks (name, description, frequency_type, frequency_value, is_active) VALUES
    ('Barrer la cocina',      'Incluir debajo de la nevera',             'daily',    1,  true),
    ('Fregar el suelo',       'Cocina, baño y pasillo',                  'daily',    2,  true),
    ('Limpiar el baño',       'Lavabo, ducha, inodoro y espejo',         'weekly',   7,  true),
    ('Pasar la aspiradora',   'Sala y dormitorios',                      'weekly',   7,  true),
    ('Limpiar microondas',    'Interior y exterior',                     'weekly',   7,  true),
    ('Cambiar sábanas',       'Todas las camas',                         'biweekly', 14, true),
    ('Limpiar nevera',        'Sacar todo y limpiar estantes',           'monthly',  30, true),
    ('Lavar ventanas',        'Cristales interiores y marcos',           'monthly',  30, true),
    ('Limpiar horno',         'Rejillas y interior',                     'monthly',  30, true),
    ('Desempolvar muebles',   'Estanterías, cuadros y rincones altos',   'weekly',   7,  true)
ON CONFLICT DO NOTHING;
