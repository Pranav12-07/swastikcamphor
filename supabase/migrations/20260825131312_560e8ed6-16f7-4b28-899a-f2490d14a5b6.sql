ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT '+91';

CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles (phone);

CREATE TABLE IF NOT EXISTS public.whatsapp_otp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_otp_sessions_phone_idx
  ON public.whatsapp_otp_sessions (phone, created_at DESC);

REVOKE ALL ON public.whatsapp_otp_sessions FROM anon, authenticated;
GRANT ALL ON public.whatsapp_otp_sessions TO service_role;
ALTER TABLE public.whatsapp_otp_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.auth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text,
  event text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_events_created_idx ON public.auth_events (created_at DESC);

GRANT ALL ON public.auth_events TO service_role;
GRANT SELECT ON public.auth_events TO authenticated;
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read auth events" ON public.auth_events;
CREATE POLICY "Admins can read auth events"
  ON public.auth_events FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));