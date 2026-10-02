CREATE TABLE IF NOT EXISTS products (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
 category TEXT NOT NULL DEFAULT 'Decoração', price_cents INTEGER NOT NULL DEFAULT 0,
 stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0), status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 source_url TEXT NOT NULL DEFAULT '', profile_id TEXT NOT NULL DEFAULT '', designer TEXT NOT NULL DEFAULT '',
 license_status TEXT NOT NULL DEFAULT 'pending' CHECK(license_status IN ('pending','approved','rejected','own_design')),
 license_reference TEXT NOT NULL DEFAULT '', images_json TEXT NOT NULL DEFAULT '[]', videos_json TEXT NOT NULL DEFAULT '[]',
 shopee_url TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0,
 material TEXT NOT NULL DEFAULT 'PETG', grams REAL NOT NULL DEFAULT 0, print_hours REAL NOT NULL DEFAULT 0,
 labor_minutes REAL NOT NULL DEFAULT 0, packaging_cents INTEGER NOT NULL DEFAULT 120, extras_cents INTEGER NOT NULL DEFAULT 0,
 price_config_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_visible ON products(status,featured,category);
CREATE TABLE IF NOT EXISTS inventory_log (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), delta INTEGER NOT NULL,
 reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_log(product_id,created_at);
CREATE TABLE IF NOT EXISTS posts (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL DEFAULT '',
 body TEXT NOT NULL DEFAULT '', cover_url TEXT NOT NULL DEFAULT '', tags_json TEXT NOT NULL DEFAULT '[]',
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_posts_visible ON posts(status,published_at);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT OR IGNORE INTO settings(key,value) VALUES
 ('brand','Zynutz 3D'),('tagline','Ideias reais, impressas em 3D.'),
 ('shopee_url','https://shopee.com.br/zynutznews'),('whatsapp',''),('instagram',''),('tiktok',''),('youtube',''),
 ('default_costs','{"filamentKg":80,"energyKwh":1.1,"printerWatts":120,"packaging":1.2,"machineHourly":1.5,"laborHourly":20,"laborMinutes":10,"wastePercent":5,"failurePercent":5,"marketplacePercent":20,"marketplaceFixed":4.5,"taxPercent":0,"targetMarginPercent":25,"adsPerSale":0,"extras":0}');
