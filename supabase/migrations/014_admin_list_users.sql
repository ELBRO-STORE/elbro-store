-- 014_admin_list_users.sql
-- Secure admin-only user listing

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  created_at TIMESTAMPTZ,
  admin_role TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    u.id,
    u.email::TEXT,
    p.full_name,
    p.phone,
    p.city,
    p.address,
    u.created_at,
    au.role::TEXT
  FROM auth.users AS u
  LEFT JOIN public.profiles AS p ON p.id = u.id
  LEFT JOIN public.admin_users AS au ON au.user_id = u.id
  WHERE EXISTS (
    SELECT 1
    FROM public.admin_users AS requester
    WHERE requester.user_id = (SELECT auth.uid())
  )
  ORDER BY u.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;