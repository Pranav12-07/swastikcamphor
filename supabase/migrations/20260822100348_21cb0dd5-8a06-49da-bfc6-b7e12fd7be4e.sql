-- Product SEO headings
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_h1 text,
  ADD COLUMN IF NOT EXISTS seo_subtitle text;

-- Contact message workflow
ALTER TABLE public.contact_submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;

DROP POLICY IF EXISTS "Staff read contact submissions" ON public.contact_submissions;
CREATE POLICY "Staff read contact submissions" ON public.contact_submissions
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff update contact submissions" ON public.contact_submissions;
CREATE POLICY "Staff update contact submissions" ON public.contact_submissions
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Admins delete contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins delete contact submissions" ON public.contact_submissions
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Blogs
CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image text,
  cover_alt text,
  category text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  seo_keywords text,
  related_links text[] NOT NULL DEFAULT '{}'::text[],
  read_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published blogs are public" ON public.blogs;
CREATE POLICY "Published blogs are public" ON public.blogs
  FOR SELECT TO anon, authenticated USING (status = 'published');
DROP POLICY IF EXISTS "Staff read all blogs" ON public.blogs;
CREATE POLICY "Staff read all blogs" ON public.blogs
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Marketing staff manage blogs" ON public.blogs;
CREATE POLICY "Marketing staff manage blogs" ON public.blogs
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'product_manager'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'product_manager'));

DROP TRIGGER IF EXISTS blogs_updated_at ON public.blogs;
CREATE TRIGGER blogs_updated_at BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS blogs_status_published_idx ON public.blogs (status, published_at DESC);