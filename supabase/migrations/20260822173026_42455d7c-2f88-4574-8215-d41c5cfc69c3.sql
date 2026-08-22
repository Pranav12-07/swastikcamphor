CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images(product_id, display_order);

GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view images of active products"
ON public.product_images FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active = true));

CREATE POLICY "Staff can view all product images"
ON public.product_images FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()));

CREATE POLICY "Product staff can insert product images"
ON public.product_images FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'product_manager'::app_role));

CREATE POLICY "Product staff can update product images"
ON public.product_images FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'product_manager'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'product_manager'::app_role));

CREATE POLICY "Product staff can delete product images"
ON public.product_images FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.is_super_admin(auth.uid()) OR private.has_role(auth.uid(), 'product_manager'::app_role));

INSERT INTO public.product_images (product_id, image_url, display_order, is_primary)
SELECT p.id, p.image_url, 0, true
FROM public.products p
WHERE p.image_url IS NOT NULL AND length(trim(p.image_url)) > 0
  AND NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id);

INSERT INTO public.product_images (product_id, image_url, display_order, is_primary)
SELECT p.id, img.url, img.ord::int, false
FROM public.products p
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(to_jsonb(p.images)) = 'array' THEN to_jsonb(p.images) ELSE '[]'::jsonb END
) WITH ORDINALITY AS img(url, ord)
WHERE length(trim(img.url)) > 0
  AND NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id AND pi.image_url = img.url);