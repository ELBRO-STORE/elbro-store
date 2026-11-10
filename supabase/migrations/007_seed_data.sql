-- ELBRO STORE - Seed Data
-- Initial categories, products, variants based on original elbro-hero.html

-- Insert categories
INSERT INTO categories (name, slug, description, display_order) VALUES
  ('Ensembles', 'ensembles', 'Ensembles complets coordonnés', 1),
  ('Vêtements', 'vetements', 'Pièces individuelles', 2),
  ('Accessoires', 'accessoires', 'Accessoires et compléments', 3),
  ('Chaussures', 'chaussures', 'Sneakers et chaussures', 4)
ON CONFLICT (slug) DO NOTHING;

-- Get category IDs for reference
DO $$
DECLARE
  cat_ensembles UUID;
  cat_vetements UUID;
  cat_accessoires UUID;
  cat_chaussures UUID;
  prod_outfit UUID;
  prod_hoodie UUID;
  prod_cargo UUID;
  prod_cap UUID;
  prod_sneakers UUID;
BEGIN
  SELECT id INTO cat_ensembles FROM categories WHERE slug = 'ensembles';
  SELECT id INTO cat_vetements FROM categories WHERE slug = 'vetements';
  SELECT id INTO cat_accessoires FROM categories WHERE slug = 'accessoires';
  SELECT id INTO cat_chaussures FROM categories WHERE slug = 'chaussures';

  -- Insert main outfit product
  INSERT INTO products (category_id, name, slug, description, full_description, material, price_cents, sale_price_cents, sku, featured, best_seller, published)
  VALUES (
    cat_ensembles,
    'ELBRO PREMIUM OUTFIT',
    'elbro-premium-outfit',
    'Ensemble premium 4 pièces : casquette, hoodie, cargo et sneakers.',
    'Le look complet ELBRO : casquette, hoodie, pantalon cargo et sneakers, pensés pour être portés ensemble. Prix ensemble avantageux par rapport à l''achat séparé.',
    'Coton premium, textile technique',
    49900,  -- 499 MAD
    69900,  -- 699 MAD (old price)
    'ELBRO-001',
    TRUE,
    TRUE,
    TRUE
  ) ON CONFLICT (slug) DO UPDATE SET
    price_cents = EXCLUDED.price_cents,
    sale_price_cents = EXCLUDED.sale_price_cents
  RETURNING id INTO prod_outfit;

  -- Insert individual pieces
  INSERT INTO products (category_id, name, slug, description, full_description, material, price_cents, sale_price_cents, sku, featured, best_seller, published)
  VALUES
    (cat_accessoires, 'Casquette Premium', 'casquette-premium', 'Casquette premium.', 'Casquette baseball premium, broderie ELBRO.', 'Coton twill', 9900, NULL, 'CAP-001', FALSE, FALSE, TRUE),
    (cat_vetements, 'Hoodie Premium', 'hoodie-premium', 'Hoodie en coton premium.', 'Hoodie zippé en coton épais, coupe oversize.', 'Coton épais 400 g', 24900, NULL, 'HOODIE-001', FALSE, FALSE, TRUE),
    (cat_vetements, 'Pantalon Cargo Premium', 'pantalon-cargo-premium', 'Pantalon cargo premium.', 'Pantalon cargo multi-poches, coupe droite.', 'Coton sergé', 19900, NULL, 'CARGO-001', FALSE, FALSE, TRUE),
    (cat_chaussures, 'Sneakers Premium', 'sneakers-premium', 'Sneakers premium.', 'Sneakers montantes, semelle confort.', 'Synthétique premium', 19900, NULL, 'SNEAKERS-001', FALSE, FALSE, TRUE)
  ON CONFLICT (slug) DO UPDATE SET
    price_cents = EXCLUDED.price_cents
  RETURNING id INTO prod_hoodie; -- Only returns last, we'll select them

  -- Get product IDs for variants
  SELECT id INTO prod_outfit FROM products WHERE slug = 'elbro-premium-outfit';
  SELECT id INTO prod_cap FROM products WHERE slug = 'casquette-premium';
  SELECT id INTO prod_hoodie FROM products WHERE slug = 'hoodie-premium';
  SELECT id INTO prod_cargo FROM products WHERE slug = 'pantalon-cargo-premium';
  SELECT id INTO prod_sneakers FROM products WHERE slug = 'sneakers-premium';

  -- Outfit variants (ONE SIZE for the complete outfit)
  INSERT INTO product_variants (product_id, size, color, stock, sku)
  VALUES
    (prod_outfit, 'ONE SIZE', 'Complet', 50, 'ELBRO-001-COMPLET')
  ON CONFLICT (product_id, size, color) DO NOTHING;

  -- Cap variants
  INSERT INTO product_variants (product_id, size, color, stock, sku)
  VALUES
    (prod_cap, 'ONE SIZE', 'Noir', 100, 'CAP-001-NOIR')
  ON CONFLICT (product_id, size, color) DO NOTHING;

  -- Hoodie variants
  INSERT INTO product_variants (product_id, size, color, stock, sku)
  VALUES
    (prod_hoodie, 'S', 'Noir', 30, 'HOODIE-001-S-NOIR'),
    (prod_hoodie, 'M', 'Noir', 40, 'HOODIE-001-M-NOIR'),
    (prod_hoodie, 'L', 'Noir', 40, 'HOODIE-001-L-NOIR'),
    (prod_hoodie, 'XL', 'Noir', 30, 'HOODIE-001-XL-NOIR'),
    (prod_hoodie, 'XXL', 'Noir', 20, 'HOODIE-001-XXL-NOIR'),
    (prod_hoodie, 'S', 'Blanc', 25, 'HOODIE-001-S-BLANC'),
    (prod_hoodie, 'M', 'Blanc', 35, 'HOODIE-001-M-BLANC'),
    (prod_hoodie, 'L', 'Blanc', 35, 'HOODIE-001-L-BLANC'),
    (prod_hoodie, 'XL', 'Blanc', 25, 'HOODIE-001-XL-BLANC'),
    (prod_hoodie, 'XXL', 'Blanc', 15, 'HOODIE-001-XXL-BLANC')
  ON CONFLICT (product_id, size, color) DO NOTHING;

  -- Cargo variants
  INSERT INTO product_variants (product_id, size, color, stock, sku)
  VALUES
    (prod_cargo, 'S', 'Noir', 30, 'CARGO-001-S-NOIR'),
    (prod_cargo, 'M', 'Noir', 40, 'CARGO-001-M-NOIR'),
    (prod_cargo, 'L', 'Noir', 40, 'CARGO-001-L-NOIR'),
    (prod_cargo, 'XL', 'Noir', 30, 'CARGO-001-XL-NOIR'),
    (prod_cargo, 'XXL', 'Noir', 20, 'CARGO-001-XXL-NOIR')
  ON CONFLICT (product_id, size, color) DO NOTHING;

  -- Sneakers variants
  INSERT INTO product_variants (product_id, size, color, stock, sku)
  VALUES
    (prod_sneakers, '39', 'Noir', 20, 'SNEAKERS-001-39-NOIR'),
    (prod_sneakers, '40', 'Noir', 25, 'SNEAKERS-001-40-NOIR'),
    (prod_sneakers, '41', 'Noir', 30, 'SNEAKERS-001-41-NOIR'),
    (prod_sneakers, '42', 'Noir', 30, 'SNEAKERS-001-42-NOIR'),
    (prod_sneakers, '43', 'Noir', 25, 'SNEAKERS-001-43-NOIR'),
    (prod_sneakers, '44', 'Noir', 20, 'SNEAKERS-001-44-NOIR')
  ON CONFLICT (product_id, size, color) DO NOTHING;

  -- Placeholder images (to be replaced with real uploads)
  -- Main outfit image
  INSERT INTO product_images (product_id, url, alt_text, is_main, display_order)
  VALUES
    (prod_outfit, '/images/outfit-main.jpg', 'ELBRO PREMIUM OUTFIT - Look complet', TRUE, 0),
    (prod_cap, '/images/cap-main.jpg', 'Casquette Premium - Noir', TRUE, 0),
    (prod_hoodie, '/images/hoodie-main.jpg', 'Hoodie Premium - Noir', TRUE, 0),
    (prod_cargo, '/images/cargo-main.jpg', 'Pantalon Cargo Premium - Noir', TRUE, 0),
    (prod_sneakers, '/images/sneakers-main.jpg', 'Sneakers Premium - Noir', TRUE, 0)
  ON CONFLICT DO NOTHING;

END $$;