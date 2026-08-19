CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_reviews_slug_idx ON public.product_reviews (product_slug, created_at DESC);

GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved reviews are public" ON public.product_reviews
  FOR SELECT TO anon, authenticated USING (approved = true);

CREATE POLICY "Signed-in users can submit reviews" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND approved = false);

CREATE POLICY "Admins manage reviews" ON public.product_reviews
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));