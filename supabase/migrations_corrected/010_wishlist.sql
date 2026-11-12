-- ELBRO STORE - Migration 010: Wishlist System
-- Adds wishlist table for user favorites

-- ============================================================
-- 1. CREATE WISHLIST TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, variant_id)
);

-- NULL variant rows need a separate unique index (NULLs are distinct in normal UNIQUE constraints).
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_product_without_variant
  ON wishlist(user_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_wishlist_product_with_variant
  ON wishlist(user_id, product_id, variant_id) WHERE variant_id IS NOT NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Users can read their own wishlist
CREATE POLICY "Users read own wishlist"
  ON wishlist FOR SELECT
  USING (user_id = auth.uid());

-- Users can add to their own wishlist
CREATE POLICY "Users insert own wishlist"
  ON wishlist FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM products p WHERE p.id = wishlist.product_id AND p.published = TRUE)
    AND (
      variant_id IS NULL OR EXISTS (
        SELECT 1 FROM product_variants v
        WHERE v.id = wishlist.variant_id AND v.product_id = wishlist.product_id
      )
    )
  );

-- Users can remove from their own wishlist
CREATE POLICY "Users delete own wishlist"
  ON wishlist FOR DELETE
  USING (user_id = auth.uid());

-- Admins can read all wishlists
CREATE POLICY "Admins read all wishlist"
  ON wishlist FOR SELECT
  USING (is_admin());

-- ============================================================
-- 3. HELPER FUNCTIONS
-- ============================================================

-- Check if product is in user's wishlist
CREATE OR REPLACE FUNCTION is_in_wishlist(p_user_id UUID, p_product_id UUID, p_variant_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT COUNT(*) INTO v_count
  FROM wishlist
  WHERE user_id = auth.uid()
    AND product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Get user's wishlist with product details
CREATE OR REPLACE FUNCTION get_user_wishlist(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  variant_id UUID,
  product_name TEXT,
  product_slug TEXT,
  product_price_cents INTEGER,
  product_sale_price_cents INTEGER,
  product_image TEXT,
  variant_size TEXT,
  variant_color TEXT,
  variant_stock INTEGER,
  variant_sku TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT
    w.id,
    w.product_id,
    w.variant_id,
    p.name as product_name,
    p.slug as product_slug,
    p.price_cents as product_price_cents,
    p.sale_price_cents as product_sale_price_cents,
    pi.url as product_image,
    v.size as variant_size,
    v.color as variant_color,
    v.stock as variant_stock,
    v.sku as variant_sku,
    w.created_at
  FROM wishlist w
  JOIN products p ON p.id = w.product_id
  LEFT JOIN LATERAL (
    SELECT i.url FROM product_images i
    WHERE i.product_id = p.id AND i.is_main = TRUE
    ORDER BY i.display_order, i.created_at
    LIMIT 1
  ) pi ON TRUE
  LEFT JOIN product_variants v
    ON v.id = w.variant_id AND v.product_id = w.product_id
  WHERE w.user_id = p_user_id
  ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Toggle wishlist (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION toggle_wishlist(p_user_id UUID, p_product_id UUID, p_variant_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM products WHERE id = p_product_id AND published = TRUE
  ) THEN
    RAISE EXCEPTION 'Product not available';
  END IF;
  IF p_variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'Invalid product variant';
  END IF;
  SELECT is_in_wishlist(auth.uid(), p_product_id, p_variant_id) INTO v_exists;

  IF v_exists THEN
    DELETE FROM wishlist
    WHERE user_id = p_user_id
      AND product_id = p_product_id
      AND variant_id IS NOT DISTINCT FROM p_variant_id;
    RETURN FALSE; -- Removed
  ELSE
    INSERT INTO wishlist (user_id, product_id, variant_id)
    VALUES (p_user_id, p_product_id, p_variant_id);
    RETURN TRUE; -- Added
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Get wishlist count for user
CREATE OR REPLACE FUNCTION get_wishlist_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT COUNT(*) INTO v_count
  FROM wishlist
  WHERE user_id = auth.uid();
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ============================================================
-- 4. GRANT PERMISSIONS
-- ============================================================

REVOKE ALL ON FUNCTION is_in_wishlist(UUID,UUID,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_user_wishlist(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION toggle_wishlist(UUID,UUID,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_wishlist_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_in_wishlist(UUID,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wishlist(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_wishlist(UUID,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wishlist_count(UUID) TO authenticated;

-- ============================================================
-- 5. ROLLBACK
-- ============================================================
-- Run this section to undo migration 010
-- ============================================================

-- DROP FUNCTION IF EXISTS get_wishlist_count(UUID);
-- DROP FUNCTION IF EXISTS toggle_wishlist(UUID, UUID, UUID);
-- DROP FUNCTION IF EXISTS get_user_wishlist(UUID);
-- DROP FUNCTION IF EXISTS is_in_wishlist(UUID, UUID, UUID);
-- DROP TABLE IF EXISTS wishlist;
