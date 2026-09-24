CREATE TABLE public.promotional_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  button_text text,
  destination_type text NOT NULL DEFAULT 'none' CHECK (destination_type IN ('none','product','category','offer','url')),
  destination_value text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotional_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotional_banners TO authenticated;
GRANT ALL ON public.promotional_banners TO service_role;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view live banners" ON public.promotional_banners FOR SELECT TO anon, authenticated
  USING (is_active AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));
CREATE POLICY "Staff manage banners" ON public.promotional_banners FOR ALL TO authenticated
  USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE INDEX promotional_banners_order_idx ON public.promotional_banners (display_order);
CREATE TRIGGER promotional_banners_updated BEFORE UPDATE ON public.promotional_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();