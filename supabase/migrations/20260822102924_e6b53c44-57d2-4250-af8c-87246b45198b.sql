-- Order tracking extras
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS expected_delivery date,
  ADD COLUMN IF NOT EXISTS delivery_note text;

-- Product visibility: keep the storefront flag in sync with the admin status
CREATE OR REPLACE FUNCTION public.sync_product_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR TG_OP = 'INSERT' THEN
    NEW.is_active := (NEW.status = 'active');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_visibility ON public.products;
CREATE TRIGGER products_visibility
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_visibility();

-- Wishlist
CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage their own wishlist"
ON public.wishlists FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);