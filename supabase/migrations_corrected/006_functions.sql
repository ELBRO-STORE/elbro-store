-- ELBRO STORE - Database Functions
-- Helper functions and triggers

-- Function to get store settings as a key-value map
CREATE OR REPLACE FUNCTION get_store_settings()
RETURNS JSONB AS $$
DECLARE
  settings JSONB := '{}'::JSONB;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT key, value FROM store_settings
    WHERE key = ANY (ARRAY[
      'store_name','whatsapp_number','currency','delivery_fee_cents',
      'free_delivery_from_cents','logo_url','instagram_url','facebook_url',
      'tiktok_url','email','phone','address','store_open'
    ])
  LOOP
    settings := jsonb_set(settings, ARRAY[rec.key], COALESCE(rec.value, 'null'::JSONB));
  END LOOP;
  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Order creation is intentionally defined only in migration 008,
-- where identity, product prices, stock and delivery settings are validated.

-- Function to update order status with validation
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_admin_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Check admin permission
  SELECT is_admin() INTO v_is_admin;
  IF NOT v_is_admin OR p_admin_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get current status
  SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate status transition
  IF v_current_status = 'CANCELLED' AND p_new_status != 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot change status from CANCELLED';
  END IF;

  IF v_current_status = 'DELIVERED' AND p_new_status != 'DELIVERED' THEN
    RAISE EXCEPTION 'Cannot change status from DELIVERED';
  END IF;

  IF p_new_status NOT IN ('NEW','CONFIRMED','PREPARING','SHIPPED','DELIVERED','CANCELLED') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;

  IF NOT (
    (v_current_status = 'NEW' AND p_new_status IN ('CONFIRMED','CANCELLED')) OR
    (v_current_status = 'CONFIRMED' AND p_new_status IN ('PREPARING','CANCELLED')) OR
    (v_current_status = 'PREPARING' AND p_new_status IN ('SHIPPED','CANCELLED')) OR
    (v_current_status = 'SHIPPED' AND p_new_status IN ('DELIVERED','CANCELLED')) OR
    (v_current_status = p_new_status)
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition';
  END IF;

  -- Update status
  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to mark order as synced to Google Sheets
CREATE OR REPLACE FUNCTION mark_order_synced(
  p_order_id UUID,
  p_sheets_order_id TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE orders
  SET google_sheets_synced = TRUE,
      google_sheets_order_id = p_sheets_order_id,
      updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to get product with variants and images (for product detail)
CREATE OR REPLACE FUNCTION get_product_detail(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'product', to_jsonb(p),
    'images', (
      SELECT COALESCE(JSONB_AGG(to_jsonb(i) ORDER BY i.display_order), '[]'::JSONB)
      FROM product_images i
      WHERE i.product_id = p.id
    ),
    'variants', (
      SELECT COALESCE(JSONB_AGG(to_jsonb(v) ORDER BY v.size, v.color), '[]'::JSONB)
      FROM product_variants v
      WHERE v.product_id = p.id
    ),
    'category', to_jsonb(c)
  ) INTO v_result
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.slug = p_slug AND p.published = TRUE;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Function to get products with filters (for listing)
CREATE OR REPLACE FUNCTION get_products_filtered(
  p_category_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_featured BOOLEAN DEFAULT NULL,
  p_best_seller BOOLEAN DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  WITH filtered AS (
    SELECT p.*
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.published = TRUE
      AND (p_category_slug IS NULL OR c.slug = p_category_slug)
      AND (NULLIF(BTRIM(p_search), '') IS NULL
           OR p.name ILIKE '%' || p_search || '%'
           OR p.description ILIKE '%' || p_search || '%')
      AND (p_featured IS NULL OR p.featured = p_featured)
      AND (p_best_seller IS NULL OR p.best_seller = p_best_seller)
  ),
  page AS (
    SELECT *
    FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'price_asc' THEN price_cents END ASC NULLS LAST,
      CASE WHEN p_sort = 'price_desc' THEN price_cents END DESC NULLS LAST,
      CASE WHEN p_sort = 'best_seller' THEN best_seller::INT END DESC NULLS LAST,
      CASE WHEN p_sort NOT IN ('price_asc','price_desc','best_seller') THEN created_at END DESC NULLS LAST
    LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'products', COALESCE((SELECT jsonb_agg(to_jsonb(page)) FROM page), '[]'::jsonb),
    'total', (SELECT COUNT(*) FROM filtered)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- Restrict execution of privileged functions; callers are explicitly granted below.
REVOKE ALL ON FUNCTION get_store_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION update_order_status(UUID,TEXT,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_order_synced(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_product_detail(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_products_filtered(TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT,INTEGER,INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_store_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_product_detail(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_products_filtered(TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT,INTEGER,INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_order_status(UUID,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_order_synced(UUID,TEXT) TO authenticated;
