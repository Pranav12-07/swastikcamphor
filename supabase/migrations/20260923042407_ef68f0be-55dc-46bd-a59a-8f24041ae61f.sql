ALTER TABLE public.products ADD COLUMN IF NOT EXISTS admin_rating numeric(2,1);

-- sanity bound (immutable, safe as a constraint)
ALTER TABLE public.products ADD CONSTRAINT products_admin_rating_range CHECK (admin_rating IS NULL OR (admin_rating >= 1 AND admin_rating <= 5));