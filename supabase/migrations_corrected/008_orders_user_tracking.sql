-- ELBRO STORE - Migration 008: Orders User Tracking & Payment Fields
-- Adds user_id foreign key, tracking fields, discount/coupon fields to orders table
-- Updates RLS policies to use user_id instead of phone matching
-- Compatible with Cash on Delivery (no payment gateway)

-- ============================================================
-- 1. ADD COLUMNS TO ORDERS TABLE
-- ============================================================

-- Add user_id column (nullable for existing guest orders)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add tracking fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS carrier TEXT,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

-- Add discount/coupon fields (for future coupon system)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
ADD COLUMN IF NOT EXISTS coupon_id UUID; -- Will reference coupons table in future migration

-- Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- ============================================================
-- 2. BACKFILL user_id FOR EXISTING ORDERS
-- ============================================================
-- Strategy: Match orders to users via customer_phone = profiles.phone
-- AND customer_email = profiles.email (when available)
-- Only fills where there's an exact match and user doesn't already have user_id
-- Guest orders (no matching profile) will keep user_id = NULL
--
-- IMPORTANT: This backfill only runs ONCE during migration.
-- Future guest order linking requires explicit user action via
-- link_guest_orders_to_user() which now verifies email + phone.

UPDATE orders o
SET user_id = matched.user_id
FROM (
  SELECT order_id, user_id
  FROM (
    SELECT o2.id AS order_id, p.id AS user_id,
           COUNT(*) OVER (PARTITION BY o2.id) AS matches
    FROM orders o2
    JOIN profiles p ON p.phone = o2.customer_phone
    JOIN auth.users u ON u.id = p.id
    WHERE o2.user_id IS NULL
      AND NULLIF(BTRIM(o2.customer_email), '') IS NOT NULL
      AND NULLIF(BTRIM(u.email), '') IS NOT NULL
      AND LOWER(BTRIM(o2.customer_email)) = LOWER(BTRIM(u.email))
  ) candidates
  WHERE matches = 1
) AS matched
WHERE o.id = matched.order_id
  AND o.user_id IS NULL;

-- ============================================================
-- 3. UPDATE RLS POLICIES ON ORDERS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users read own orders" ON orders;
DROP POLICY IF EXISTS "Users create orders" ON orders;
DROP POLICY IF EXISTS "Admins manage orders" ON orders;

-- Policy 1: Users can read their own orders (via user_id)
-- Guest orders (user_id IS NULL) are NOT readable by users
-- Authenticated orders are readable by the owning user
CREATE POLICY "Users read own orders"
  ON orders FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

-- Policy 3: Admins have full access to all orders
CREATE POLICY "Admins manage orders"
  ON orders FOR ALL
  USING (
    is_admin()
  )
  WITH CHECK (is_admin());

-- ============================================================
-- 4. UPDATE RLS POLICIES ON ORDER_ITEMS TABLE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users read own order items" ON order_items;
DROP POLICY IF EXISTS "Admins manage order items" ON order_items;

-- Policy 1: Users can read order items for their own orders
-- Joins through orders table using user_id
CREATE POLICY "Users read own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR is_admin()
      )
    )
  );

-- Policy 2: Admins have full access
CREATE POLICY "Admins manage order items"
  ON order_items FOR ALL
  USING (
    is_admin()
  )
  WITH CHECK (is_admin());

-- ============================================================
-- 5. ADD HELPER FUNCTION FOR ORDER CREATION WITH USER_ID
-- ============================================================

-- Remove the legacy 9-argument RPC; leaving it would expose an insecure overload.
DROP FUNCTION IF EXISTS create_order(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER);

-- Secure create_order RPC with authenticated identity and server-derived prices.
CREATE OR REPLACE FUNCTION create_order(
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_city TEXT,
  p_customer_address TEXT,
  p_customer_email TEXT,
  p_delivery_instructions TEXT,
  p_notes TEXT,
  p_items JSONB,
  p_delivery_fee_cents INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_discount_cents INTEGER DEFAULT 0,
  p_coupon_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_order_id UUID;
  v_order_ref TEXT;
  v_subtotal BIGINT := 0;
  v_total BIGINT;
  v_delivery_fee INTEGER := 0;
  v_free_delivery_from INTEGER;
  v_store_open BOOLEAN := TRUE;
  v_user_id UUID := auth.uid();
  v_item JSONB;
  v_product products%ROWTYPE;
  v_variant product_variants%ROWTYPE;
  v_product_id UUID;
  v_variant_id UUID;
  v_qty INTEGER;
  v_unit_price INTEGER;
  v_piece TEXT;
  v_size TEXT;
  v_color TEXT;
BEGIN
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'User identity mismatch';
  END IF;
  IF v_user_id IS NULL AND p_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Guest order cannot set user_id';
  END IF;
  IF NULLIF(BTRIM(p_customer_name), '') IS NULL
     OR NULLIF(BTRIM(p_customer_phone), '') IS NULL
     OR NULLIF(BTRIM(p_customer_city), '') IS NULL
     OR NULLIF(BTRIM(p_customer_address), '') IS NULL THEN
    RAISE EXCEPTION 'Required customer fields are missing';
  END IF;
  -- Delivery fees and store availability are controlled by database settings,
  -- never by a client-supplied amount.
  SELECT COALESCE((value #>> '{}')::BOOLEAN, TRUE) INTO v_store_open
  FROM store_settings WHERE key = 'store_open';
  IF COALESCE(v_store_open, TRUE) = FALSE THEN
    RAISE EXCEPTION 'Store is currently closed';
  END IF;
  SELECT COALESCE(
    (SELECT (value #>> '{}')::INTEGER FROM store_settings WHERE key = 'delivery_fee_cents'),
    0
  ) INTO v_delivery_fee;
  SELECT NULLIF(value #>> '{}','')::INTEGER INTO v_free_delivery_from
  FROM store_settings WHERE key = 'free_delivery_from_cents';
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  IF COALESCE(p_discount_cents, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid discount amount';
  END IF;
  IF p_coupon_id IS NULL AND COALESCE(p_discount_cents, 0) <> 0 THEN
    RAISE EXCEPTION 'A discount requires a valid coupon';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::UUID;
    v_variant_id := NULLIF(v_item->>'variant_id','')::UUID;
    v_qty := NULLIF(v_item->>'quantity','')::INTEGER;
    IF v_product_id IS NULL OR v_qty IS NULL OR v_qty < 1 OR v_qty > 100 THEN
      RAISE EXCEPTION 'Invalid order item';
    END IF;

    SELECT * INTO v_product FROM products
    WHERE id = v_product_id AND published = TRUE
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable'; END IF;

    v_unit_price := CASE
      WHEN v_product.sale_price_cents IS NOT NULL
       AND v_product.sale_price_cents < v_product.price_cents
      THEN v_product.sale_price_cents
      ELSE v_product.price_cents
    END;
    v_piece := v_product.name;
    v_size := COALESCE(v_item->>'size','');
    v_color := COALESCE(v_item->>'color','');

    IF v_variant_id IS NULL AND EXISTS (
      SELECT 1 FROM product_variants WHERE product_id = v_product_id
    ) THEN
      RAISE EXCEPTION 'A variant must be selected for this product';
    END IF;
    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM product_variants
      WHERE id = v_variant_id AND product_id = v_product_id
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product variant'; END IF;
      IF v_variant.stock < v_qty THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
      v_size := v_variant.size;
      v_color := v_variant.color;
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
    IF v_subtotal > 2000000000 THEN RAISE EXCEPTION 'Order total is too large'; END IF;

  END LOOP;

  -- Re-iterate the original payload after validation to insert trusted values.
  v_order_ref := 'ELBRO-' || to_char(clock_timestamp(),'YYYYMMDD-HH24MISS') || '-' ||
                 upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  IF v_free_delivery_from IS NOT NULL AND v_subtotal >= v_free_delivery_from THEN
    v_delivery_fee := 0;
  END IF;
  v_total := v_subtotal + v_delivery_fee;
  IF v_total > 2000000000 THEN RAISE EXCEPTION 'Order total is too large'; END IF;

  INSERT INTO orders (
    order_ref, customer_name, customer_phone, customer_city, customer_address,
    customer_email, delivery_instructions, notes, subtotal_cents,
    delivery_fee_cents, total_cents, status, user_id, discount_cents, coupon_id
  ) VALUES (
    v_order_ref, BTRIM(p_customer_name), BTRIM(p_customer_phone), BTRIM(p_customer_city),
    BTRIM(p_customer_address), NULLIF(BTRIM(p_customer_email), ''),
    p_delivery_instructions, p_notes, v_subtotal, v_delivery_fee,
    v_total, 'NEW', v_user_id, 0, p_coupon_id
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_variant_id := NULLIF(v_item->>'variant_id','')::UUID;
    v_qty := (v_item->>'quantity')::INTEGER;
    SELECT * INTO v_product FROM products WHERE id = v_product_id AND published = TRUE FOR SHARE;
    v_unit_price := CASE
      WHEN v_product.sale_price_cents IS NOT NULL
       AND v_product.sale_price_cents < v_product.price_cents
      THEN v_product.sale_price_cents ELSE v_product.price_cents END;
    v_piece := v_product.name;
    v_size := COALESCE(v_item->>'size','');
    v_color := COALESCE(v_item->>'color','');
    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM product_variants
      WHERE id = v_variant_id AND product_id = v_product_id
      FOR UPDATE;
      v_size := v_variant.size;
      v_color := v_variant.color;
    END IF;
    INSERT INTO order_items (
      order_id, product_id, variant_id, piece_name, size, color,
      quantity, unit_price_cents, subtotal_cents
    ) VALUES (
      v_order_id, v_product_id, v_variant_id, v_piece, v_size, v_color,
      v_qty, v_unit_price, v_qty * v_unit_price
    );
  END LOOP;

  IF p_coupon_id IS NOT NULL THEN
    IF to_regprocedure('public.finalize_coupon_order(uuid)') IS NULL THEN
      RAISE EXCEPTION 'Coupon migration is not installed';
    END IF;
    EXECUTE 'SELECT public.finalize_coupon_order($1)' USING v_order_id;
  END IF;
  RETURN v_order_id;
END;
$$;

-- ============================================================
-- 6. ADD HELPER FUNCTION TO UPDATE ORDER USER_ID (for linking guest orders after signup)
-- ============================================================
-- Safely links guest orders to authenticated user by verifying BOTH phone AND email
-- Only links orders where: user_id IS NULL AND customer_phone matches profile phone
-- AND (customer_email IS NULL OR customer_email matches profile email)
-- This prevents phone collision attacks where multiple users share a phone number.

CREATE OR REPLACE FUNCTION link_guest_orders_to_user(p_user_id UUID, p_phone TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_phone TEXT;
  v_email TEXT;
  v_updated INTEGER := 0;
BEGIN
  IF v_user IS NULL OR p_user_id IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT phone INTO v_phone FROM profiles WHERE id = v_user;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  IF NULLIF(v_phone,'') IS NULL OR p_phone IS DISTINCT FROM v_phone
     OR NULLIF(v_email,'') IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE orders o
  SET user_id = v_user
  WHERE o.user_id IS NULL
    AND o.customer_phone = v_phone
    AND LOWER(BTRIM(o.customer_email)) = LOWER(BTRIM(v_email));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Guest tracking requires both the unguessable order reference and the checkout phone.
CREATE OR REPLACE FUNCTION get_order_for_tracking(
  p_order_ref TEXT,
  p_customer_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NULLIF(BTRIM(p_order_ref),'') IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT jsonb_build_object(
    'id', o.id,
    'order_ref', o.order_ref,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'customer_city', o.customer_city,
    'customer_address', o.customer_address,
    'customer_email', o.customer_email,
    'delivery_instructions', o.delivery_instructions,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'discount_cents', o.discount_cents,
    'total_cents', o.total_cents,
    'status', o.status,
    'tracking_number', o.tracking_number,
    'carrier', o.carrier,
    'shipped_at', o.shipped_at,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.created_at)
      FROM order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM orders o
  WHERE o.order_ref = BTRIM(p_order_ref)
    AND (
      (o.user_id IS NOT NULL AND auth.uid() = o.user_id)
      OR (o.user_id IS NULL AND o.customer_phone = BTRIM(p_customer_phone))
    );
  RETURN v_result;
END;
$$;

-- Securely return the newly created order to checkout (guest must prove phone).
CREATE OR REPLACE FUNCTION get_order_after_create(
  p_order_id UUID,
  p_customer_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'order_ref', o.order_ref,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'customer_city', o.customer_city,
    'customer_address', o.customer_address,
    'customer_email', o.customer_email,
    'delivery_instructions', o.delivery_instructions,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'discount_cents', o.discount_cents,
    'total_cents', o.total_cents,
    'status', o.status,
    'tracking_number', o.tracking_number,
    'carrier', o.carrier,
    'shipped_at', o.shipped_at,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', COALESCE((
      SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.created_at)
      FROM order_items oi WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM orders o
  WHERE o.id = p_order_id
    AND (
      (o.user_id IS NOT NULL AND o.user_id = auth.uid())
      OR (o.user_id IS NULL AND o.customer_phone = BTRIM(p_customer_phone))
    );
  RETURN v_result;
END;
$$;

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

REVOKE ALL ON FUNCTION create_order(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER,UUID,INTEGER,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION link_guest_orders_to_user(UUID,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_order_for_tracking(TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_order_after_create(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB,INTEGER,UUID,INTEGER,UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION link_guest_orders_to_user(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_for_tracking(TEXT,TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_order_after_create(UUID,TEXT) TO anon, authenticated;

-- ============================================================


-- A cancelled order restores its reserved stock exactly once.
CREATE OR REPLACE FUNCTION handle_order_cancellation_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status <> NEW.status AND NOT (
    (OLD.status = 'NEW' AND NEW.status IN ('CONFIRMED','CANCELLED')) OR
    (OLD.status = 'CONFIRMED' AND NEW.status IN ('PREPARING','CANCELLED')) OR
    (OLD.status = 'PREPARING' AND NEW.status IN ('SHIPPED','CANCELLED')) OR
    (OLD.status = 'SHIPPED' AND NEW.status IN ('DELIVERED','CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition';
  END IF;
  IF OLD.status <> 'CANCELLED' AND NEW.status = 'CANCELLED' THEN
    UPDATE product_variants v
    SET stock = v.stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = OLD.id
      AND oi.variant_id = v.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_cancel_restore_stock
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_cancellation_stock();
