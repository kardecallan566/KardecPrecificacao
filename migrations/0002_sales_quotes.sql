-- Gestão de vendas manuais e histórico de orçamentos. Não altera o catálogo existente.
CREATE TABLE IF NOT EXISTS sales (
 id TEXT PRIMARY KEY,
 channel TEXT NOT NULL CHECK(channel IN ('shopee','whatsapp','site','other')),
 external_order TEXT,
 product_id TEXT NOT NULL REFERENCES products(id),
 quantity INTEGER NOT NULL CHECK(quantity>=1 AND quantity<=10000),
 gross_cents INTEGER NOT NULL CHECK(gross_cents>=0),
 fee_cents INTEGER NOT NULL DEFAULT 0 CHECK(fee_cents>=0),
 seller_shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK(seller_shipping_cents>=0),
 other_cents INTEGER NOT NULL DEFAULT 0 CHECK(other_cents>=0),
 unit_cost_cents INTEGER NOT NULL CHECK(unit_cost_cents>=0),
 contribution_cents INTEGER NOT NULL,
 sold_at TEXT NOT NULL,
 note TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(channel,external_order,product_id)
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id,sold_at DESC);
-- Bloqueio transacional: uma venda não pode exceder o estoque disponível.
CREATE TRIGGER IF NOT EXISTS sales_check_stock BEFORE INSERT ON sales
WHEN (SELECT stock FROM products WHERE id=NEW.product_id)<NEW.quantity
BEGIN SELECT RAISE(ABORT,'insufficient_stock'); END;
CREATE TABLE IF NOT EXISTS quotes (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL DEFAULT '',
 source_url TEXT NOT NULL DEFAULT '',
 input_json TEXT NOT NULL,
 costs_json TEXT NOT NULL,
 result_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quotes_date ON quotes(created_at DESC);
