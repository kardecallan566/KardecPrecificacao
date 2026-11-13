-- Catálogo unificado: produtos próprios e recomendações afiliadas compartilham a mesma vitrine.
ALTER TABLE products ADD COLUMN product_kind TEXT NOT NULL DEFAULT 'own' CHECK(product_kind IN ('own','affiliate'));
ALTER TABLE products ADD COLUMN purchase_url TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN affiliate_network TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN affiliate_disclosure TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_products_kind_status ON products(product_kind,status,featured);
