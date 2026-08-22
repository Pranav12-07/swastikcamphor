
CREATE OR REPLACE FUNCTION public.place_order(
  _user_id uuid,
  _customer jsonb,
  _items jsonb,
  _coupon text,
  _payment_method text
) RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = private, public
AS $$
  SELECT private.place_order(_user_id, _customer, _items, _coupon, _payment_method);
$$;
REVOKE ALL ON FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) TO service_role;
