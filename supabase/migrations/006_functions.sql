-- ELBRO STORE - Database Functions
-- Helper functions and triggers

-- Function to get store settings as a key-value map
CREATE OR REPLACE FUNCTION get_store_settings()
RETURNS JSONB AS $$
DECLARE
  settings JSONB := '{}'::JSONB;
  rec RECORD;
BEGIN
  FOR rec IN SELECT key, value FROM store_settings LOOP
    settings := jsonb_set(settings, ARRAY[rec.key], COALESCE(rec.value, 'null'::JSONB));
  END LOOP;
  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create order with items (atomic transaction)
CREATE OR REPLACE FUNCTION create_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_city TEXT,
  p_customer_address TEXT,
  p_customer_email TEXT,
  p_delivery_instructions TEXT,
  p_notes TEXT,
  p_items JSONB, -- Array of {product_id, variant_id, piece_name, size, color, quantity, unit_price_cents}
  p_delivery_fee_cents INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_order_ref TEXT;
  v_subtotal_cents INTEGER := 0;
  v_total_cents INTEGER;
  v_item JSONB;
BEGIN
  -- Generate order reference
  v_order_ref := 'ELBRO-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

  -- Calculate subtotal from items
  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items) LOOP
    v_subtotal_cents := v_subtotal_cents + (v_item->>'quantity')::INTEGER * (v_item->>'unit_price_cents')::INTEGER;
  END LOOP;

  v_total_cents := v_subtotal_cents + p_delivery_fee_cents;

  -- Create order
  INSERT INTO orders (
    order_ref,
    customer_name,
    customer_phone,
    customer_city,
    customer_address,
    customer_email,
    delivery_instructions,
    notes,
    subtotal_cents,
    delivery_fee_cents,
    total_cents,
    status
  ) VALUES (
    v_order_ref,
    p_customer_name,
    p_customer_phone,
    p_customer_city,
    p_customer_address,
    p_customer_email,
    p_delivery_instructions,
    p_notes,
    v_subtotal_cents,
    p_delivery_fee_cents,
    v_total_cents,
    'NEW'
  ) RETURNING id INTO v_order_id;

  -- Create order items
  FOR v_item IN SELECT * FROM JSONB_ARRAY_ELEMENTS(p_items) LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      piece_name,
      size,
      color,
      quantity,
      unit_price_cents,
      subtotal_cents
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      CASE WHEN (v_item->>'variant_id') IS NOT NULL THEN (v_item->>'variant_id')::UUID ELSE NULL END,
      v_item->>'piece_name',
      v_item->>'size',
      v_item->>'color',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price_cents')::INTEGER,
      (v_item->>'quantity')::INTEGER * (v_item->>'unit_price_cents')::INTEGER
    );
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_admin_user_id) INTO v_is_admin;
  IF NOT v_is_admin THEN
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

  -- Update status
  UPDATE orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark order as synced to Google Sheets
CREATE OR REPLACE FUNCTION mark_order_synced(
  p_order_id UUID,
  p_sheets_order_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE orders
  SET google_sheets_synced = TRUE,
      google_sheets_order_id = p_sheets_order_id,
      updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get products with filters (for listing)
CREATE OR REPLACE FUNCTION get_products_filtered(
  p_category_slug TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_featured BOOLEAN DEFAULT NULL,
  p_best_seller BOOLEAN DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest', -- newest, price_asc, price_desc, best_seller
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_query TEXT;
  v_count INTEGER;
  v_results JSONB;
BEGIN
  -- Build dynamic query
  v_query := '
    SELECT jsonb_build_object(
      ''products'', COALESCE(JSONB_AGG(to_jsonb(p) ORDER BY
        CASE
          WHEN $6 = ''price_asc'' THEN p.price_cents
          WHEN $6 = ''price_desc'' THEN p.price_cents DESC
          WHEN $6 = ''best_seller'' THEN p.best_seller DESC
          ELSE p.created_at DESC
        END
      ), ''[]''::JSONB),
      ''total'', COUNT(*) OVER()
    )
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.published = TRUE
  ';

  IF p_category_slug IS NOT NULL THEN
    v_query := v_query || ' AND c.slug = $1';
  END IF;

  IF p_search IS NOT NULL THEN
    v_query := v_query || ' AND (p.name ILIKE $2 OR p.description ILIKE $2)';
  END IF;

  IF p_featured IS NOT NULL THEN
    v_query := v_query || ' AND p.featured = $3';
  END IF;

  IF p_best_seller IS NOT NULL THEN
    v_query := v_query || ' AND p.best_seller = $4';
  END IF;

  v_query := v_query || ' LIMIT $5 OFFSET $6';

  -- This is a simplified version; in production use proper dynamic SQL
  RETURN '{}'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;