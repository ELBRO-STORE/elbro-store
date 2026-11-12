-- 012: Fix admin review management

CREATE OR REPLACE FUNCTION admin_update_product_review(
  p_review_id UUID,
  p_rating INTEGER DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_content TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_rating IS NOT NULL AND (p_rating < 1 OR p_rating > 5) THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  UPDATE product_reviews
  SET
    rating = COALESCE(p_rating, rating),
    title = CASE WHEN p_title IS NULL THEN title
                 ELSE NULLIF(BTRIM(p_title), '') END,
    content = CASE WHEN p_content IS NULL THEN content
                   ELSE NULLIF(BTRIM(p_content), '') END,
    updated_at = NOW()
  WHERE id = p_review_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_product_review(
  p_review_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM product_reviews WHERE id = p_review_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION admin_update_product_review(UUID,INTEGER,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_delete_product_review(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_update_product_review(UUID,INTEGER,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_product_review(UUID) TO authenticated;