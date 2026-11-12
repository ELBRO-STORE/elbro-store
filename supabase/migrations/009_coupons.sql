-- ELBRO STORE - Migration 009: Coupons System
-- Adds coupons table with validation rules, usage tracking, and admin management
-- Compatible with Cash on Delivery (discounts applied at order creation)

-- ============================================================
-- 1. CREATE COUPONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code = UPPER(BTRIM(code)) AND code ~ '^[A-Z0-9_-]+$'), -- e.g., "WELCOME10", "SUMMER20"
  name TEXT NOT NULL, -- e.g., "Welcome Discount", "Summer Sale"
  description TEXT,

  -- Discount configuration
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0 AND (discount_type <> 'percentage' OR discount_value <= 100)), -- percentage (1-100) or amount in cents

  -- Usage limits
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0), -- NULL = unlimited total uses
  usage_limit_per_user INTEGER DEFAULT 1 CHECK (usage_limit_per_user IS NULL OR usage_limit_per_user > 0), -- NULL = unlimited per user
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),

  -- Validity period
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ, -- NULL = no expiration
  CHECK (valid_until IS NULL OR valid_until >= valid_from),

  -- Conditions
  minimum_order_cents INTEGER NOT NULL DEFAULT 0 CHECK (minimum_order_cents >= 0),
  applicable_categories UUID[] DEFAULT '{}', -- Empty = all categories
  applicable_products UUID[] DEFAULT '{}', -- Empty = all products
  excluded_products UUID[] DEFAULT '{}',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE, -- If false, only admin can apply

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CREATE COUPON USAGE TRACKING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for guest
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  discount_applied_cents INTEGER NOT NULL CHECK (discount_applied_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_coupons_valid_dates ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupon_usages_coupon_id ON coupon_usages(coupon_id);
CREATE INDEX idx_coupon_usages_user_id ON coupon_usages(user_id);
CREATE INDEX idx_coupon_usages_order_id ON coupon_usages(order_id);

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_coupon
  FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_usages_order
  ON coupon_usages(order_id) WHERE order_id IS NOT NULL;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

-- Coupons policies
-- Public coupons: anyone can read active, valid public coupons
CREATE POLICY "Public coupons readable"
  ON coupons FOR SELECT
  USING (
    is_active = TRUE
    AND is_public = TRUE
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW())
  );

-- Admin users: full access to all coupons
CREATE POLICY "Admins manage coupons"
  ON coupons FOR ALL
  USING (
    is_admin()
  )
  WITH CHECK (is_admin());

-- Coupon usages policies
-- Users can view their own coupon usages
CREATE POLICY "Users view own coupon usages"
  ON coupon_usages FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all coupon usages
CREATE POLICY "Admins view all coupon usages"
  ON coupon_usages FOR SELECT
  USING (
    is_admin()
  );

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Remove the invalid legacy argument order if an earlier draft was installed.
DROP FUNCTION IF EXISTS validate_coupon(TEXT,UUID,INTEGER,UUID[],UUID[]);

-- Validate coupon and calculate discount
CREATE OR REPLACE FUNCTION validate_coupon(
  p_code TEXT,
  p_order_subtotal_cents INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_category_ids UUID[] DEFAULT '{}',
  p_product_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value INTEGER,
  discount_cents INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER := 0;
  v_discount_cents INTEGER := 0;
  v_min_order_ok BOOLEAN := TRUE;
  v_category_ok BOOLEAN := TRUE;
  v_product_ok BOOLEAN := TRUE;
  v_excluded_ok BOOLEAN := TRUE;
BEGIN
  p_user_id := auth.uid();
  IF p_order_subtotal_cents IS NULL OR p_order_subtotal_cents < 0 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER, 'Montant invalide';
    RETURN;
  END IF;
  -- Find coupon by code (case insensitive)
  SELECT * INTO v_coupon
  FROM coupons
  WHERE code = UPPER(BTRIM(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL, NULL, NULL, NULL, 'Coupon invalide';
    RETURN;
  END IF;

  -- Private coupons are not usable by ordinary customers.
  IF NOT v_coupon.is_public AND NOT is_admin() THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon non disponible';
    RETURN;
  END IF;

  -- Check if active
  IF NOT v_coupon.is_active THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon inactif';
    RETURN;
  END IF;

  -- Check validity period
  IF v_coupon.valid_from > NOW() THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon pas encore valide';
    RETURN;
  END IF;

  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon expiré';
    RETURN;
  END IF;

  -- Check minimum order
  IF p_order_subtotal_cents < v_coupon.minimum_order_cents THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL,
      'Minimum de commande requis: ' || (v_coupon.minimum_order_cents / 100) || ' MAD';
    RETURN;
  END IF;

  -- Check total usage limit
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Limite d''utilisation atteinte';
    RETURN;
  END IF;

  -- Check per-user usage limit (if authenticated)
  IF p_user_id IS NOT NULL AND v_coupon.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM coupon_usages
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_user_usage_count >= v_coupon.usage_limit_per_user THEN
      RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL,
        'Vous avez déjà utilisé ce coupon ' || v_coupon.usage_limit_per_user || ' fois';
      RETURN;
    END IF;
  END IF;

  -- Check category applicability
  IF COALESCE(cardinality(v_coupon.applicable_categories), 0) > 0
     AND NOT (v_coupon.applicable_categories && COALESCE(p_category_ids, '{}'::UUID[])) THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon non applicable aux produits sélectionnés';
    RETURN;
  END IF;

  -- Check product applicability
  IF COALESCE(cardinality(v_coupon.applicable_products), 0) > 0
     AND NOT (v_coupon.applicable_products && COALESCE(p_product_ids, '{}'::UUID[])) THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon non applicable aux produits sélectionnés';
    RETURN;
  END IF;

  -- Check excluded products
  IF COALESCE(cardinality(v_coupon.excluded_products), 0) > 0
     AND (v_coupon.excluded_products && COALESCE(p_product_ids, '{}'::UUID[])) THEN
    RETURN QUERY SELECT FALSE, v_coupon.id, NULL, NULL, NULL, 'Coupon non applicable à certains produits';
    RETURN;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount_cents := ((p_order_subtotal_cents::BIGINT * v_coupon.discount_value) / 100)::INTEGER;
  ELSE
    v_discount_cents := v_coupon.discount_value;
  END IF;

  -- Cap discount at subtotal
  IF v_discount_cents > p_order_subtotal_cents THEN
    v_discount_cents := p_order_subtotal_cents;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    v_coupon.id,
    v_coupon.discount_type,
    v_coupon.discount_value,
    v_discount_cents,
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Final server-side coupon verification; called by create_order after inserting items.
CREATE OR REPLACE FUNCTION finalize_coupon_order(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_coupon coupons%ROWTYPE;
  v_discount INTEGER := 0;
  v_user_count INTEGER := 0;
  v_has_applicable BOOLEAN := FALSE;
  v_has_excluded BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.coupon_id IS NULL THEN
    RAISE EXCEPTION 'Order or coupon not found';
  END IF;

  SELECT * INTO v_coupon FROM coupons WHERE id = v_order.coupon_id FOR UPDATE;
  IF NOT FOUND OR NOT v_coupon.is_active OR
     v_coupon.valid_from > NOW() OR
     (v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW()) THEN
    RAISE EXCEPTION 'Coupon is inactive or expired';
  END IF;
  IF NOT v_coupon.is_public AND NOT is_admin() THEN
    RAISE EXCEPTION 'Coupon is not available';
  END IF;
  IF v_order.subtotal_cents < v_coupon.minimum_order_cents THEN
    RAISE EXCEPTION 'Minimum order amount not reached';
  END IF;
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
    RAISE EXCEPTION 'Coupon usage limit reached';
  END IF;

  IF v_order.user_id IS NOT NULL AND v_coupon.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_count
    FROM coupon_usages
    WHERE coupon_id = v_coupon.id AND user_id = v_order.user_id;
    IF v_user_count >= v_coupon.usage_limit_per_user THEN
      RAISE EXCEPTION 'User coupon usage limit reached';
    END IF;
  END IF;

  IF COALESCE(cardinality(v_coupon.applicable_categories),0) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id
        AND p.category_id = ANY(v_coupon.applicable_categories)
    ) INTO v_has_applicable;
    IF NOT v_has_applicable THEN RAISE EXCEPTION 'Coupon does not apply to these categories'; END IF;
  END IF;
  IF COALESCE(cardinality(v_coupon.applicable_products),0) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = p_order_id
        AND oi.product_id = ANY(v_coupon.applicable_products)
    ) INTO v_has_applicable;
    IF NOT v_has_applicable THEN RAISE EXCEPTION 'Coupon does not apply to these products'; END IF;
  END IF;
  IF COALESCE(cardinality(v_coupon.excluded_products),0) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = p_order_id
        AND oi.product_id = ANY(v_coupon.excluded_products)
    ) INTO v_has_excluded;
    IF v_has_excluded THEN RAISE EXCEPTION 'Order contains excluded products'; END IF;
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := ((v_order.subtotal_cents::BIGINT * v_coupon.discount_value) / 100)::INTEGER;
  ELSE
    v_discount := LEAST(v_coupon.discount_value, v_order.subtotal_cents);
  END IF;

  UPDATE orders
  SET discount_cents = v_discount,
      total_cents = GREATEST(subtotal_cents + delivery_fee_cents - v_discount, 0)
  WHERE id = p_order_id;

  INSERT INTO coupon_usages(coupon_id,user_id,order_id,discount_applied_cents)
  VALUES(v_coupon.id,v_order.user_id,p_order_id,v_discount);

  UPDATE coupons SET usage_count = usage_count + 1 WHERE id = v_coupon.id;
END;
$$;

REVOKE ALL ON FUNCTION finalize_coupon_order(UUID) FROM PUBLIC;

-- Record coupon usage
CREATE OR REPLACE FUNCTION record_coupon_usage(
  p_coupon_id UUID,
  p_order_id UUID,
  p_discount_cents INTEGER,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM coupon_usages cu
    WHERE cu.order_id = p_order_id AND cu.coupon_id = p_coupon_id
  ) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = p_order_id
      AND o.coupon_id = p_coupon_id
      AND o.discount_cents = p_discount_cents
      AND (o.user_id = auth.uid() OR is_admin())
  ) THEN
    RAISE EXCEPTION 'Coupon usage does not match an authorized order';
  END IF;
  -- Idempotent: create_order records usage atomically; service follow-up is a no-op.
  IF EXISTS (SELECT 1 FROM coupon_usages WHERE order_id = p_order_id) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Coupon usage must be recorded during order creation';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Get available coupons for user (public + their private)
CREATE OR REPLACE FUNCTION get_available_coupons(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  description TEXT,
  discount_type TEXT,
  discount_value INTEGER,
  minimum_order_cents INTEGER,
  valid_until TIMESTAMPTZ
) AS $$
BEGIN
  p_user_id := auth.uid();
  RETURN QUERY
  SELECT
    c.id,
    c.code,
    c.name,
    c.description,
    c.discount_type,
    c.discount_value,
    c.minimum_order_cents,
    c.valid_until
  FROM coupons c
  WHERE c.is_active = TRUE
    AND c.valid_from <= NOW()
    AND (c.valid_until IS NULL OR c.valid_until >= NOW())
    AND (c.is_public = TRUE OR is_admin())
    AND (c.usage_limit IS NULL OR c.usage_count < c.usage_limit)
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Admin: create coupon
CREATE OR REPLACE FUNCTION admin_create_coupon(
  p_code TEXT,
  p_name TEXT,
  p_description TEXT,
  p_discount_type TEXT,
  p_discount_value INTEGER,
  p_usage_limit INTEGER DEFAULT NULL,
  p_usage_limit_per_user INTEGER DEFAULT 1,
  p_valid_from TIMESTAMPTZ DEFAULT NOW(),
  p_valid_until TIMESTAMPTZ DEFAULT NULL,
  p_minimum_order_cents INTEGER DEFAULT 0,
  p_applicable_categories UUID[] DEFAULT '{}',
  p_applicable_products UUID[] DEFAULT '{}',
  p_excluded_products UUID[] DEFAULT '{}',
  p_is_active BOOLEAN DEFAULT TRUE,
  p_is_public BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
  v_coupon_id UUID;
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF NULLIF(BTRIM(p_code),'') IS NULL OR NULLIF(BTRIM(p_name),'') IS NULL
     OR p_discount_value IS NULL OR p_discount_value <= 0
     OR COALESCE(p_minimum_order_cents,0) < 0
     OR (p_usage_limit IS NOT NULL AND p_usage_limit < 1)
     OR (p_usage_limit_per_user IS NOT NULL AND p_usage_limit_per_user < 1)
     OR (p_valid_until IS NOT NULL AND p_valid_until < p_valid_from) THEN
    RAISE EXCEPTION 'Invalid coupon parameters';
  END IF;

  -- Check code uniqueness
  IF EXISTS (SELECT 1 FROM coupons WHERE code = UPPER(BTRIM(p_code))) THEN
    RAISE EXCEPTION 'Code coupon déjà utilisé';
  END IF;

  -- Validate discount type
  IF p_discount_type NOT IN ('percentage', 'fixed_amount') THEN
    RAISE EXCEPTION 'Type de réduction invalide';
  END IF;

  -- Validate percentage range
  IF p_discount_type = 'percentage' AND (p_discount_value < 1 OR p_discount_value > 100) THEN
    RAISE EXCEPTION 'Pourcentage doit être entre 1 et 100';
  END IF;

  INSERT INTO coupons (
    code, name, description,
    discount_type, discount_value,
    usage_limit, usage_limit_per_user,
    valid_from, valid_until,
    minimum_order_cents,
    applicable_categories, applicable_products, excluded_products,
    is_active, is_public,
    created_by
  ) VALUES (
    UPPER(BTRIM(p_code)), BTRIM(p_name), p_description,
    p_discount_type, p_discount_value,
    p_usage_limit, p_usage_limit_per_user,
    p_valid_from, p_valid_until,
    p_minimum_order_cents,
    p_applicable_categories, p_applicable_products, p_excluded_products,
    p_is_active, p_is_public,
    auth.uid()
  ) RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Admin: update coupon
CREATE OR REPLACE FUNCTION admin_update_coupon(
  p_coupon_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_discount_value INTEGER DEFAULT NULL,
  p_usage_limit INTEGER DEFAULT NULL,
  p_usage_limit_per_user INTEGER DEFAULT NULL,
  p_valid_until TIMESTAMPTZ DEFAULT NULL,
  p_minimum_order_cents INTEGER DEFAULT NULL,
  p_applicable_categories UUID[] DEFAULT NULL,
  p_applicable_products UUID[] DEFAULT NULL,
  p_excluded_products UUID[] DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_discount_value IS NOT NULL AND p_discount_value <= 0 THEN
    RAISE EXCEPTION 'Discount value must be positive';
  END IF;
  IF p_discount_value IS NOT NULL AND EXISTS (
    SELECT 1 FROM coupons
    WHERE id = p_coupon_id AND discount_type = 'percentage'
      AND p_discount_value > 100
  ) THEN
    RAISE EXCEPTION 'Percentage discount must be between 1 and 100';
  END IF;
  IF p_minimum_order_cents IS NOT NULL AND p_minimum_order_cents < 0 THEN
    RAISE EXCEPTION 'Minimum order cannot be negative';
  END IF;
  IF p_usage_limit IS NOT NULL AND p_usage_limit < 1 THEN
    RAISE EXCEPTION 'Usage limit must be positive or NULL';
  END IF;
  IF p_usage_limit_per_user IS NOT NULL AND p_usage_limit_per_user < 1 THEN
    RAISE EXCEPTION 'Per-user limit must be positive or NULL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM coupons WHERE id = p_coupon_id) THEN
    RETURN FALSE;
  END IF;

  UPDATE coupons SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    discount_value = COALESCE(p_discount_value, discount_value),
    usage_limit = COALESCE(p_usage_limit, usage_limit),
    usage_limit_per_user = COALESCE(p_usage_limit_per_user, usage_limit_per_user),
    valid_until = COALESCE(p_valid_until, valid_until),
    minimum_order_cents = COALESCE(p_minimum_order_cents, minimum_order_cents),
    applicable_categories = COALESCE(p_applicable_categories, applicable_categories),
    applicable_products = COALESCE(p_applicable_products, applicable_products),
    excluded_products = COALESCE(p_excluded_products, excluded_products),
    is_active = COALESCE(p_is_active, is_active),
    is_public = COALESCE(p_is_public, is_public),
    updated_at = NOW()
  WHERE id = p_coupon_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Admin: delete coupon (soft delete - set inactive)
CREATE OR REPLACE FUNCTION admin_delete_coupon(p_coupon_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE coupons SET is_active = FALSE WHERE id = p_coupon_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

REVOKE ALL ON FUNCTION validate_coupon(TEXT,INTEGER,UUID,UUID[],UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_coupon_usage(UUID,UUID,INTEGER,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_available_coupons(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_create_coupon(TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,UUID[],UUID[],UUID[],BOOLEAN,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_update_coupon(UUID,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TIMESTAMPTZ,INTEGER,UUID[],UUID[],UUID[],BOOLEAN,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_delete_coupon(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION validate_coupon(TEXT,INTEGER,UUID,UUID[],UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_coupon_usage(UUID,UUID,INTEGER,UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_available_coupons(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_coupon(TEXT,TEXT,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TIMESTAMPTZ,TIMESTAMPTZ,INTEGER,UUID[],UUID[],UUID[],BOOLEAN,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_coupon(UUID,TEXT,TEXT,INTEGER,INTEGER,INTEGER,TIMESTAMPTZ,INTEGER,UUID[],UUID[],UUID[],BOOLEAN,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_coupon(UUID) TO authenticated;

-- ============================================================
-- 8. ROLLBACK
-- ============================================================
-- Run this section to undo migration 009
/*
DROP FUNCTION IF EXISTS admin_delete_coupon(UUID);
DROP FUNCTION IF EXISTS admin_update_coupon(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ, INTEGER, UUID[], UUID[], UUID[], BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS admin_create_coupon(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, UUID[], UUID[], UUID[], BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_available_coupons(UUID);
DROP FUNCTION IF EXISTS record_coupon_usage(UUID, UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS validate_coupon(TEXT, UUID, INTEGER, UUID[], UUID[]);

DROP POLICY IF EXISTS "Public coupons readable" ON coupons;
DROP POLICY IF EXISTS "Admins manage coupons" ON coupons;
DROP POLICY IF EXISTS "Users view own coupon usages" ON coupon_usages;
DROP POLICY IF EXISTS "Admins view all coupon usages" ON coupon_usages;
DROP POLICY IF EXISTS "System inserts coupon usage" ON coupon_usages;

DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;

DROP INDEX IF EXISTS idx_coupon_usages_order_id;
DROP INDEX IF EXISTS idx_coupon_usages_user_id;
DROP INDEX IF EXISTS idx_coupon_usages_coupon_id;
DROP INDEX IF EXISTS idx_coupons_valid_dates;
DROP INDEX IF EXISTS idx_coupons_active;
DROP INDEX IF EXISTS idx_coupons_code;

DROP TABLE IF EXISTS coupon_usages;
DROP TABLE IF EXISTS coupons;
*/
