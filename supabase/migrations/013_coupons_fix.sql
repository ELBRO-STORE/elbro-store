-- 013: Allow admins to clear coupon limits and expiration

CREATE OR REPLACE FUNCTION admin_clear_coupon_limits(
  p_coupon_id UUID,
  p_clear_usage_limit BOOLEAN DEFAULT FALSE,
  p_clear_usage_limit_per_user BOOLEAN DEFAULT FALSE,
  p_clear_valid_until BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE coupons
  SET
    usage_limit = CASE WHEN p_clear_usage_limit
                       THEN NULL ELSE usage_limit END,
    usage_limit_per_user = CASE WHEN p_clear_usage_limit_per_user
                                THEN NULL ELSE usage_limit_per_user END,
    valid_until = CASE WHEN p_clear_valid_until
                       THEN NULL ELSE valid_until END,
    updated_at = NOW()
  WHERE id = p_coupon_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION admin_clear_coupon_limits(UUID,BOOLEAN,BOOLEAN,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_clear_coupon_limits(UUID,BOOLEAN,BOOLEAN,BOOLEAN) TO authenticated;