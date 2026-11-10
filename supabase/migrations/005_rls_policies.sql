-- ELBRO STORE - Row Level Security Policies
-- Secure access policies for all tables

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CATEGORIES: Public read, Admin write
-- ============================================================
CREATE POLICY "Public read published categories"
  ON categories FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins manage categories"
  ON categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- PRODUCTS: Public read published, Admin full access
-- ============================================================
CREATE POLICY "Public read published products"
  ON products FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Admins manage products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- PRODUCT IMAGES: Public read for published products, Admin full
-- ============================================================
CREATE POLICY "Public read product images"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_images.product_id
      AND p.published = TRUE
    )
  );

CREATE POLICY "Admins manage product images"
  ON product_images FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- PRODUCT VARIANTS: Public read for published products, Admin full
-- ============================================================
CREATE POLICY "Public read product variants"
  ON product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
      AND p.published = TRUE
    )
  );

CREATE POLICY "Admins manage product variants"
  ON product_variants FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- ORDERS: Users read own, Admins full access
-- ============================================================
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  USING (
    customer_phone = (
      SELECT phone FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users create orders"
  ON orders FOR INSERT
  WITH CHECK (TRUE); -- Allow guest orders, validated server-side

CREATE POLICY "Admins manage orders"
  ON orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- ORDER ITEMS: Users read own (via order), Admins full
-- ============================================================
CREATE POLICY "Users read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (
        o.customer_phone = (
          SELECT phone FROM profiles WHERE id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
      )
    )
  );

CREATE POLICY "Admins manage order items"
  ON order_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- STORAGE POLICIES (for product-images bucket)
-- ============================================================
-- Note: These are applied via Supabase Dashboard or storage policies
-- Public read for product images
-- Admin write for product images