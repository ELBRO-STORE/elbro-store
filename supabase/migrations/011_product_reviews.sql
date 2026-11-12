-- ELBRO STORE - Migration 011: Product Reviews System
-- Adds reviews table for product ratings and reviews

-- ============================================================
-- 1. CREATE REVIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id, order_id)
);

-- PostgreSQL UNIQUE permits multiple NULL order_id values; enforce one general review.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_reviews_general
  ON product_reviews(user_id, product_id) WHERE order_id IS NULL;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order_id ON product_reviews(order_id);

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews for published products
CREATE POLICY "Anyone can read reviews"
  ON product_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_reviews.product_id
      AND p.published = TRUE
    )
  );

-- Authenticated users can create reviews for products they purchased
-- (verified through order ownership)
CREATE POLICY "Users can create reviews for purchased products"
  ON product_reviews FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- User has a delivered order containing this product
      EXISTS (
        SELECT 1 FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.id = product_reviews.order_id
        AND o.user_id = auth.uid()
        AND o.status = 'DELIVERED'
        AND oi.product_id = product_reviews.product_id
      )
      OR
      -- Allow reviews without order_id for general feedback (non-verified)
      (order_id IS NULL AND verified_purchase = FALSE)
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON product_reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON product_reviews FOR DELETE
  USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins manage reviews"
  ON product_reviews FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 3. HELPER FUNCTIONS
-- ============================================================

-- Get product reviews with user info
CREATE OR REPLACE FUNCTION get_product_reviews(p_product_id UUID, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  user_id UUID,
  order_id UUID,
  rating INTEGER,
  title TEXT,
  content TEXT,
  verified_purchase BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_name TEXT,
  user_avatar TEXT
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND published = TRUE) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    pr.id,
    pr.product_id,
    pr.user_id,
    pr.order_id,
    pr.rating,
    pr.title,
    pr.content,
    pr.verified_purchase,
    pr.created_at,
    pr.updated_at,
    COALESCE(p.full_name, 'Utilisateur') as user_name,
    NULL as user_avatar
  FROM product_reviews pr
  LEFT JOIN profiles p ON p.id = pr.user_id
  WHERE pr.product_id = p_product_id
  ORDER BY pr.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,20),1),100) OFFSET GREATEST(COALESCE(p_offset,0),0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Get product review statistics
CREATE OR REPLACE FUNCTION get_product_review_stats(p_product_id UUID)
RETURNS TABLE (
  total_reviews BIGINT,
  average_rating NUMERIC(3,2),
  rating_1 BIGINT,
  rating_2 BIGINT,
  rating_3 BIGINT,
  rating_4 BIGINT,
  rating_5 BIGINT,
  verified_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    COUNT(*) FILTER (WHERE rating = 1) as rating_1,
    COUNT(*) FILTER (WHERE rating = 2) as rating_2,
    COUNT(*) FILTER (WHERE rating = 3) as rating_3,
    COUNT(*) FILTER (WHERE rating = 4) as rating_4,
    COUNT(*) FILTER (WHERE rating = 5) as rating_5,
    COUNT(*) FILTER (WHERE verified_purchase = TRUE) as verified_count
  FROM product_reviews
  WHERE product_id = p_product_id
    AND EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND published = TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Check if user can review a product (has delivered order with product)
CREATE OR REPLACE FUNCTION can_user_review_product(p_user_id UUID, p_product_id UUID)
RETURNS TABLE (
  can_review BOOLEAN,
  has_delivered_order BOOLEAN,
  existing_review_id UUID
) AS $$
DECLARE
  v_order_exists BOOLEAN;
  v_review_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  -- Check if user has a delivered order with this product
  SELECT EXISTS (
    SELECT 1 FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = p_user_id
    AND o.status = 'DELIVERED'
    AND oi.product_id = p_product_id
  ) INTO v_order_exists;

  -- Check if user already reviewed this product (without order constraint for general reviews)
  SELECT id INTO v_review_id
  FROM product_reviews
  WHERE user_id = p_user_id
  AND product_id = p_product_id
  LIMIT 1;

  RETURN QUERY SELECT
    (v_review_id IS NULL) as can_review,
    v_order_exists as has_delivered_order,
    v_review_id as existing_review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Create review
CREATE OR REPLACE FUNCTION create_product_review(
  p_product_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_title TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_verified_purchase BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_review_id UUID;
  v_verified BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be 1 to 5'; END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND published = TRUE) THEN
    RAISE EXCEPTION 'Product not available';
  END IF;
  IF EXISTS (
    SELECT 1 FROM product_reviews
    WHERE user_id = auth.uid() AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this product';
  END IF;
  IF p_order_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = p_order_id
        AND o.user_id = auth.uid()
        AND o.status = 'DELIVERED'
        AND oi.product_id = p_product_id
    ) INTO v_verified;
    IF NOT v_verified THEN RAISE EXCEPTION 'Verified purchase required for this order'; END IF;
  END IF;
  INSERT INTO product_reviews (
    product_id,user_id,order_id,rating,title,content,verified_purchase
  ) VALUES (
    p_product_id,auth.uid(),p_order_id,p_rating,
    NULLIF(BTRIM(p_title),''),NULLIF(BTRIM(p_content),''),v_verified
  ) RETURNING id INTO v_review_id;
  RETURN v_review_id;
END;
$$;

-- Update review
CREATE OR REPLACE FUNCTION update_product_review(
  p_review_id UUID,
  p_user_id UUID,
  p_rating INTEGER DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE product_reviews
  SET
    rating = COALESCE(p_rating, rating),
    title = COALESCE(p_title, title),
    content = COALESCE(p_content, content),
    updated_at = NOW()
  WHERE id = p_review_id AND user_id = auth.uid()
    AND p_user_id = auth.uid();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Delete review
CREATE OR REPLACE FUNCTION delete_product_review(p_review_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM product_reviews
  WHERE id = p_review_id AND user_id = auth.uid()
    AND p_user_id = auth.uid();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- Update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Do not allow direct table writes that could forge verified_purchase.
-- All review mutations go through the validated SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE ON product_reviews FROM anon, authenticated;
GRANT SELECT ON product_reviews TO anon, authenticated;

-- ============================================================
-- 5. GRANT PERMISSIONS
-- ============================================================

REVOKE ALL ON FUNCTION get_product_reviews(UUID,INTEGER,INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_product_review_stats(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_user_review_product(UUID,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_product_review(UUID,UUID,INTEGER,TEXT,TEXT,UUID,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION update_product_review(UUID,UUID,INTEGER,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION delete_product_review(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_product_reviews(UUID,INTEGER,INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_review_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION can_user_review_product(UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_product_review(UUID,UUID,INTEGER,TEXT,TEXT,UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_review(UUID,UUID,INTEGER,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_product_review(UUID,UUID) TO authenticated;

-- ============================================================
-- 6. ROLLBACK
-- ============================================================
-- Run this section to undo migration 011
-- ============================================================

-- DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
-- DROP FUNCTION IF EXISTS update_product_review(UUID, UUID, INTEGER, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS create_product_review(UUID, UUID, INTEGER, TEXT, TEXT, UUID, BOOLEAN);
-- DROP FUNCTION IF EXISTS can_user_review_product(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_product_review_stats(UUID);
-- DROP FUNCTION IF EXISTS get_product_reviews(UUID, INTEGER, INTEGER);
-- DROP TABLE IF EXISTS product_reviews;
