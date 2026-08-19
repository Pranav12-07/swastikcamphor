ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description text;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);