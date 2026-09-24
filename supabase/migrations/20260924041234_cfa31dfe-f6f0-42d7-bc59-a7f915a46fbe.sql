ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS admin_rating_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_admin_rating_count_range;

ALTER TABLE public.products
ADD CONSTRAINT products_admin_rating_count_range
CHECK (admin_rating_count >= 0 AND admin_rating_count <= 10000000);