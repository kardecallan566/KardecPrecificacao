-- Validações adicionais na base, preservando dados e migrações anteriores.
-- Os gatilhos atuam sobre INSERT/UPDATE futuros, sem reescrever linhas legadas.
CREATE TRIGGER IF NOT EXISTS products_secure_insert BEFORE INSERT ON products
WHEN NEW.price_cents < 0 OR NEW.grams < 0 OR NEW.print_hours < 0
 OR (NEW.status='published' AND (NEW.price_cents<=0
 OR (CASE WHEN json_valid(NEW.images_json) THEN json_array_length(NEW.images_json) ELSE 0 END)=0 OR NOT ((NEW.license_status='own_design' AND NEW.source_url='')
 OR (NEW.license_status='approved' AND length(trim(NEW.license_reference))>=8))))
BEGIN SELECT RAISE(ABORT,'invalid_published_product'); END;
CREATE TRIGGER IF NOT EXISTS products_secure_update BEFORE UPDATE ON products
WHEN NEW.price_cents < 0 OR NEW.grams < 0 OR NEW.print_hours < 0
 OR (NEW.status='published' AND (NEW.price_cents<=0
 OR (CASE WHEN json_valid(NEW.images_json) THEN json_array_length(NEW.images_json) ELSE 0 END)=0 OR NOT ((NEW.license_status='own_design' AND NEW.source_url='')
 OR (NEW.license_status='approved' AND length(trim(NEW.license_reference))>=8))))
BEGIN SELECT RAISE(ABORT,'invalid_published_product'); END;
CREATE TRIGGER IF NOT EXISTS sales_secure_totals BEFORE INSERT ON sales
WHEN NEW.contribution_cents != (NEW.gross_cents - NEW.fee_cents - NEW.seller_shipping_cents
 - NEW.other_cents - NEW.unit_cost_cents*NEW.quantity)
BEGIN SELECT RAISE(ABORT,'invalid_sale_totals'); END;
