
ALTER FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.place_order(uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.place_order(uuid, jsonb, jsonb, text, text) TO service_role;
