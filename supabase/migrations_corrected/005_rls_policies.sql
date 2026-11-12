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
    is_admin()
  )
  WITH CHECK (is_admin());

-- ============================================================
-- PRODUCTS: Public read published, Admin full access
-- ============================================================
CREATE POLICY "Public read published products"
  ON products FOR SELECT
  USING (published = TRUE);

CREATE POLICY "Admins manage products"
  ON products FOR ALL
  USING (
    is_admin()
  )
  WITH CHECK (is_admin());

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
    is_admin()
  )
  WITH CHECK (is_admin());

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
    is_admin()
  )
  WITH CHECK (is_admin());

-- ============================================================
-- ORDERS: Users read own, Admins full access
-- ============================================================
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  USING (
    customer_phone = (
      SELECT phone FROM profiles WHERE id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Admins manage orders"
  ON orders FOR ALL
  USING (
    is_admin()
  )
  WITH CHECK (is_admin());

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
        OR is_admin()
      )
    )
  );

CREATE POLICY "Admins manage order items"
  ON order_items FOR ALL
  USING (
    is_admin()
  )
  WITH CHECK (is_admin());

-- ============================================================
-- STORAGE POLICIES (for product-images bucket)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

DROP POLICY IF EXISTS "Public read product images bucket" ON storage.objects;
CREATE POLICY "Public read product images bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins upload product images bucket" ON storage.objects;
CREATE POLICY "Admins upload product images bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update product images bucket" ON storage.objects;
CREATE POLICY "Admins update product images bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete product images bucket" ON storage.objects;
CREATE POLICY "Admins delete product images bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());
