-- 1. Marketplace rating badge fields on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS marketplace_name text,
  ADD COLUMN IF NOT EXISTS marketplace_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS marketplace_rating_count integer,
  ADD COLUMN IF NOT EXISTS marketplace_url text,
  ADD COLUMN IF NOT EXISTS marketplace_checked_on date;

-- 2. Review upgrades
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS size_label text,
  ADD COLUMN IF NOT EXISTS helpful_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS store_reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamp with time zone;

-- 3. Helpful votes: one per signed-in user per review
CREATE TABLE IF NOT EXISTS public.review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.review_votes TO authenticated;
GRANT ALL ON public.review_votes TO service_role;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own votes" ON public.review_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own vote" ON public.review_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own vote" ON public.review_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Review-request tracking (5 days after delivery, one reminder)
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  email text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  reminder_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_slug)
);
GRANT ALL ON public.review_requests TO service_role;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- 5. The 3 professional products with 16 pack options
INSERT INTO public.products (
  slug, name, sku, category, short_description, description, price, compare_at_price,
  stock_quantity, low_stock_threshold, is_active, is_featured, status, image_url,
  sizes, features, specifications, size_options, seo_title, seo_description
) VALUES (
  'camphor-tablets', 'Swastik Camphor Tablets', 'SWK-TAB', 'camphor-tablets',
  '100% pure camphor tablets with a clean, residue-free burn for daily pooja and aarti.',
  'Swastik Camphor Tablets are made in Hyderabad by Vijayasree Camphor Industries, makers of Swastik Camphor since 1968. Each tablet burns with a bright, steady flame and a consistent, clean, residue-free burn, suited to daily pooja, aarti and temple rituals, and to air purification at home. Available in jars from 50 g to 500 g, a 100 g refill pouch, and Twin Packs that save more.',
  115, 120, 74, 10, true, true, 'active',
  '/api/public/product-image/products/1790185322838-9oecdm-haihcv4zr5gs65ga-0.webp',
  ARRAY['50 g','100 g','250 g','500 g','1 kg'],
  ARRAY['100% pure camphor','Clean, residue-free burn','Bright, steady flame for pooja and aarti','Suitable for air purification'],
  '{"form":"Tablets","how_to_use":"Place a tablet on a camphor stand or aarti plate and light the tip. Always burn on a heat-proof surface.","safety":"Flammable. Never leave a burning tablet unattended. Keep out of reach of children and pets. Not for consumption. Store in a cool, dry place with the lid closed."}'::jsonb,
  '[
    {"label":"50 g Jar","short_label":"50 g","grams":50,"unit_grams":50,"pack_count":1,"container":"Jar","sku":"SWK-TAB-050G-JAR","price":115,"mrp":120,"stock":74,"image":"/api/public/product-image/products/1790185292022-s9jp5u-haihcv4pq2ys8ufc-0.webp","popular":false,"featured":false},
    {"label":"100 g Jar","short_label":"100 g","grams":100,"unit_grams":100,"pack_count":1,"container":"Jar","sku":"SWK-TAB-100G-JAR","price":210,"mrp":225,"stock":80,"image":"/api/public/product-image/products/1790185322838-9oecdm-haihcv4zr5gs65ga-0.webp","popular":false,"featured":true,"is_default":true},
    {"label":"Twin Pack – 2 × 50 g Jars (100 g)","short_label":"2 × 50 g","grams":100,"unit_grams":50,"pack_count":2,"container":"Jar","sku":"SWK-TAB-050G-JAR-X2","price":210,"mrp":240,"stock":100,"image":"/api/public/product-image/products/1790190614566-50y6o3-50g-po2.webp","popular":false,"featured":false},
    {"label":"Twin Pack – 2 × 100 g Jars (200 g)","short_label":"2 × 100 g","grams":200,"unit_grams":100,"pack_count":2,"container":"Jar","sku":"SWK-TAB-100G-JAR-X2","price":380,"mrp":450,"stock":99,"image":"/api/public/product-image/products/1790190725606-40w1ni-100g-po2.webp","popular":false,"featured":true},
    {"label":"250 g Jar","short_label":"250 g","grams":250,"unit_grams":250,"pack_count":1,"container":"Jar","sku":"SWK-TAB-250G-JAR","price":495,"mrp":525,"stock":100,"image":"/api/public/product-image/products/1790185172602-rtcbao-250g-jar.webp","popular":false,"featured":true},
    {"label":"500 g Jar","short_label":"500 g","grams":500,"unit_grams":500,"pack_count":1,"container":"Jar","sku":"SWK-TAB-500G-JAR","price":925,"mrp":975,"stock":100,"image":"/api/public/product-image/products/1790185147105-xywga2-250g-jar.webp","popular":false,"featured":false},
    {"label":"Twin Pack – 2 × 250 g Jars (500 g)","short_label":"2 × 250 g","grams":500,"unit_grams":250,"pack_count":2,"container":"Jar","sku":"SWK-TAB-250G-JAR-X2","price":900,"mrp":1050,"stock":100,"image":"/api/public/product-image/products/1790190694044-zzep8g-250g-po2.webp","popular":false,"featured":false},
    {"label":"Twin Pack – 2 × 500 g Jars (1 kg)","short_label":"2 × 500 g","grams":1000,"unit_grams":500,"pack_count":2,"container":"Jar","sku":"SWK-TAB-500G-JAR-X2","price":1770,"mrp":1950,"stock":100,"image":"/api/public/product-image/products/1790190655435-6x39w5-500g-jar-po2.webp","popular":false,"featured":true}
  ]'::jsonb,
  'Swastik Camphor Tablets, 100% Pure | 50 g to 1 kg | Swastik Camphor',
  'Buy Swastik 100% pure camphor tablets online: clean, residue-free burn for pooja and aarti. Jars from 50 g to 500 g and Twin Packs. Free shipping above ₹499.'
), (
  'bhimseni-camphor', 'Swastik Bhimseni Camphor', 'SWK-BHM', 'bhimseni-camphor',
  'Natural Bhimseni camphor crystals for pooja and enhancing air quality.',
  'Swastik Bhimseni Camphor is 100% pure, natural camphor in crystal form, made in Hyderabad by Vijayasree Camphor Industries, makers of Swastik Camphor since 1968. Valued for its therapeutic properties, it is suitable for pooja, medicinal uses and enhancing air quality at home. Available in jars from 50 g to 450 g, and Twin Packs up to 900 g.',
  140, 160, 100, 10, true, true, 'active',
  '/api/public/product-image/products/1790185408949-z2e6xj-haigwdjugyrs3vqu-0.webp',
  ARRAY['50 g','100 g','250 g','450 g','900 g'],
  ARRAY['100% pure, natural camphor crystals','Clean, residue-free burn','Valued for its therapeutic properties','Suitable for medicinal uses and enhancing air quality'],
  '{"form":"Crystals","how_to_use":"For pooja, place a few crystals on an aarti plate or camphor stand and light carefully. For aroma, use in a camphor diffuser (kapur dani) as directed by the diffuser maker.","safety":"Flammable. Never leave burning camphor unattended. Keep out of reach of children and pets. Store in the closed jar in a cool, dry place."}'::jsonb,
  '[
    {"label":"50 g Jar","short_label":"50 g","grams":50,"unit_grams":50,"pack_count":1,"container":"Jar","sku":"SWK-BHM-050G-JAR","price":140,"mrp":160,"stock":100,"image":"/api/public/product-image/products/1790185380645-p5r88z-haihcv4syyxc8whz-0.webp","popular":false,"featured":false},
    {"label":"100 g Jar","short_label":"100 g","grams":100,"unit_grams":100,"pack_count":1,"container":"Jar","sku":"SWK-BHM-100G-JAR","price":270,"mrp":290,"stock":95,"image":"/api/public/product-image/products/1790185408949-z2e6xj-haigwdjugyrs3vqu-0.webp","popular":false,"featured":true,"is_default":true},
    {"label":"Twin Pack – 2 × 100 g Jars (200 g)","short_label":"2 × 100 g","grams":200,"unit_grams":100,"pack_count":2,"container":"Jar","sku":"SWK-BHM-100G-JAR-X2","price":490,"mrp":580,"stock":97,"image":"/api/public/product-image/products/1790190806400-5vh5m7-100g-po2.webp","popular":false,"featured":true},
    {"label":"250 g Jar","short_label":"250 g","grams":250,"unit_grams":250,"pack_count":1,"container":"Jar","sku":"SWK-BHM-250G-JAR","price":620,"mrp":650,"stock":99,"image":"/api/public/product-image/products/1790190917531-c6380g-250g-jar.webp","popular":false,"featured":false},
    {"label":"450 g Jar","short_label":"450 g","grams":450,"unit_grams":450,"pack_count":1,"container":"Jar","sku":"SWK-BHM-450G-JAR","price":1080,"mrp":1125,"stock":96,"image":"/api/public/product-image/products/1790190886893-1tmknc-250g-jar.webp","popular":false,"featured":true},
    {"label":"Twin Pack – 2 × 250 g Jars (500 g)","short_label":"2 × 250 g","grams":500,"unit_grams":250,"pack_count":2,"container":"Jar","sku":"SWK-BHM-250G-JAR-X2","price":1130,"mrp":1300,"stock":100,"image":"/api/public/product-image/products/1790190833084-mzbd2t-250g-jar-po2.webp","popular":false,"featured":false},
    {"label":"Twin Pack – 2 × 450 g Jars (900 g)","short_label":"2 × 450 g","grams":900,"unit_grams":450,"pack_count":2,"container":"Jar","sku":"SWK-BHM-450G-JAR-X2","price":1940,"mrp":2250,"stock":100,"image":"/api/public/product-image/products/1790190488142-iqpttr-500g-jar-po2.webp","popular":false,"featured":true}
  ]'::jsonb,
  'Swastik Bhimseni Camphor, 100% Pure | 50 g to 900 g | Swastik Camphor',
  'Buy Swastik 100% pure Bhimseni camphor crystals online for pooja and enhancing air quality. Jars from 50 g to 450 g and Twin Packs. Free shipping above ₹499.'
), (
  'camphor-tablets-refill-pouch', 'Swastik Camphor Tablets – Refill Pouch', 'SWK-POU', 'camphor-tablets',
  '100% pure camphor tablets in a convenient 100 g refill pouch.',
  'Swastik Camphor Tablets in a pouch specially designed for easy, convenient use in pooja, aarti and for their aroma. Refill your Swastik jar and keep the tablets fresh.',
  195, 210, 100, 10, true, false, 'active',
  '/api/public/product-image/products/1790185263828-rxgevz-haihdfgu5aaqkzhx-0.webp',
  ARRAY['100 g'],
  ARRAY['100% pure camphor','Clean, residue-free burn','Easy, convenient pouch for refills'],
  '{"form":"Tablets","how_to_use":"Place a tablet on a camphor stand or aarti plate and light the tip. Always burn on a heat-proof surface.","safety":"Flammable. Never leave a burning tablet unattended. Keep out of reach of children and pets. Not for consumption. Store in a cool, dry place with the lid closed."}'::jsonb,
  '[
    {"label":"100 g Refill Pouch","short_label":"100 g","grams":100,"unit_grams":100,"pack_count":1,"container":"Refill Pouch","sku":"SWK-TAB-100G-POUCH","price":195,"mrp":210,"stock":100,"image":"/api/public/product-image/products/1790185263828-rxgevz-haihdfgu5aaqkzhx-0.webp","popular":false,"featured":false,"is_default":true}
  ]'::jsonb,
  'Swastik Camphor Tablets Refill Pouch, 100 g | Swastik Camphor',
  'Swastik 100% pure camphor tablets in a convenient 100 g refill pouch. Free shipping above ₹499.'
);

-- 6. Retire the old listings (kept for past orders, hidden from the shop)
UPDATE public.products
   SET is_active = false, status = 'disabled'
 WHERE slug IN (
   'camphor',
   'swastik-100-pure-camphor-tablets-25-grams-jar-pack-of-2-50-grams',
   'swastik-100-pure-camphor-tablets-50-grams-jar',
   'swastik-100-pure-camphor-tablets-50-grams-jar-pack-of-2-100-grams',
   'swastik-100-pure-camphor-tablets-100-grams-jar',
   'swastik-100-pure-camphor-tablets-100-grams-jar-pack-of-2',
   'swastik-100-pure-camphor-tablets-100-grams-pouch',
   'swastik-100-pure-camphor-tablets-250-grams-jar',
   'swastik-100-pure-camphor-tablets-250-grams-jar-pack-of-2-500-grams',
   'swastik-100-pure-camphor-tablets-500-grams-jar',
   'swastik-100-pure-camphor-tablets-500-grams-jar-pack-of-2-1000-grams',
   'swastik-100-pure-bhimseni-camphor-50-grams-jar',
   'swastik-100-pure-bhimseni-camphor-50-grams-jar-pack-of-2-100-grams',
   'swastik-100-pure-bhimseni-camphor-100-grams-jar',
   'swastik-100-pure-bhimseni-camphor-100-grams-jar-pack-of-2',
   'swastik-100-pure-bhimseni-camphor-250-grams-jar',
   'swastik-100-pure-bhimseni-camphor-250-grams-jar-pack-of-2',
   'swastik-100-pure-bhimseni-camphor-450-grams-jar',
   'swastik-100-pure-bhimseni-camphor-450-grams-jar-pack-of-2-900-grams'
 );

-- 7. Move reviews from old listings to the new products, tagged with the pack bought
WITH map(old_slug, new_slug, size_label) AS (
  VALUES
    ('swastik-100-pure-camphor-tablets-25-grams-jar-pack-of-2-50-grams','camphor-tablets','50 g Jar'),
    ('swastik-100-pure-camphor-tablets-50-grams-jar','camphor-tablets','50 g Jar'),
    ('swastik-100-pure-camphor-tablets-50-grams-jar-pack-of-2-100-grams','camphor-tablets','Twin Pack – 2 × 50 g Jars (100 g)'),
    ('swastik-100-pure-camphor-tablets-100-grams-jar','camphor-tablets','100 g Jar'),
    ('swastik-100-pure-camphor-tablets-100-grams-jar-pack-of-2','camphor-tablets','Twin Pack – 2 × 100 g Jars (200 g)'),
    ('swastik-100-pure-camphor-tablets-100-grams-pouch','camphor-tablets-refill-pouch','100 g Refill Pouch'),
    ('swastik-100-pure-camphor-tablets-250-grams-jar','camphor-tablets','250 g Jar'),
    ('swastik-100-pure-camphor-tablets-250-grams-jar-pack-of-2-500-grams','camphor-tablets','Twin Pack – 2 × 250 g Jars (500 g)'),
    ('swastik-100-pure-camphor-tablets-500-grams-jar','camphor-tablets','500 g Jar'),
    ('swastik-100-pure-camphor-tablets-500-grams-jar-pack-of-2-1000-grams','camphor-tablets','Twin Pack – 2 × 500 g Jars (1 kg)'),
    ('swastik-100-pure-bhimseni-camphor-50-grams-jar','bhimseni-camphor','50 g Jar'),
    ('swastik-100-pure-bhimseni-camphor-50-grams-jar-pack-of-2-100-grams','bhimseni-camphor','50 g Jar'),
    ('swastik-100-pure-bhimseni-camphor-100-grams-jar','bhimseni-camphor','100 g Jar'),
    ('swastik-100-pure-bhimseni-camphor-100-grams-jar-pack-of-2','bhimseni-camphor','Twin Pack – 2 × 100 g Jars (200 g)'),
    ('swastik-100-pure-bhimseni-camphor-250-grams-jar','bhimseni-camphor','250 g Jar'),
    ('swastik-100-pure-bhimseni-camphor-250-grams-jar-pack-of-2','bhimseni-camphor','Twin Pack – 2 × 250 g Jars (500 g)'),
    ('swastik-100-pure-bhimseni-camphor-450-grams-jar','bhimseni-camphor','450 g Jar'),
    ('swastik-100-pure-bhimseni-camphor-450-grams-jar-pack-of-2-900-grams','bhimseni-camphor','Twin Pack – 2 × 450 g Jars (900 g)')
)
UPDATE public.product_reviews r
   SET product_slug = m.new_slug, size_label = m.size_label
  FROM map m WHERE r.product_slug = m.old_slug;

-- 8. Move wishlist saves to the new products (skip duplicates, then drop old rows)
WITH map(old_slug, new_slug) AS (
  VALUES
    ('swastik-100-pure-camphor-tablets-25-grams-jar-pack-of-2-50-grams','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-50-grams-jar','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-50-grams-jar-pack-of-2-100-grams','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-100-grams-jar','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-100-grams-jar-pack-of-2','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-100-grams-pouch','camphor-tablets-refill-pouch'),
    ('swastik-100-pure-camphor-tablets-250-grams-jar','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-250-grams-jar-pack-of-2-500-grams','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-500-grams-jar','camphor-tablets'),
    ('swastik-100-pure-camphor-tablets-500-grams-jar-pack-of-2-1000-grams','camphor-tablets'),
    ('swastik-100-pure-bhimseni-camphor-50-grams-jar','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-50-grams-jar-pack-of-2-100-grams','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-100-grams-jar','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-100-grams-jar-pack-of-2','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-250-grams-jar','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-250-grams-jar-pack-of-2','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-450-grams-jar','bhimseni-camphor'),
    ('swastik-100-pure-bhimseni-camphor-450-grams-jar-pack-of-2-900-grams','bhimseni-camphor')
),
ins AS (
  INSERT INTO public.wishlists (user_id, product_slug)
  SELECT DISTINCT w.user_id, m.new_slug
    FROM public.wishlists w JOIN map m ON m.old_slug = w.product_slug
   WHERE NOT EXISTS (
     SELECT 1 FROM public.wishlists x WHERE x.user_id = w.user_id AND x.product_slug = m.new_slug
   )
  RETURNING id
)
DELETE FROM public.wishlists w USING map m WHERE w.product_slug = m.old_slug;

-- 9. place_order: record the pack option SKU on the order line
CREATE OR REPLACE FUNCTION private.place_order(_user_id uuid, _customer jsonb, _items jsonb, _coupon text, _payment_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  it jsonb;
  prod public.products%ROWTYPE;
  qty int;
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  free_above numeric := 499;
  flat_rate numeric := 100;
  cod_fee numeric := 0;
  v_order_number text;
  new_order_id uuid;
  cpn public.coupons%ROWTYPE;
  new_stock int;
  pay_method text := COALESCE(NULLIF(_payment_method, ''), 'upi');
  size_label text;
  size_idx int;
  size_price numeric;
  size_stock int;
  size_sku text;
  unit_price numeric;
BEGIN
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty';
  END IF;

  SELECT COALESCE((value->>'value')::numeric, free_above) INTO free_above FROM public.store_settings WHERE key = 'shipping_free_above';
  SELECT COALESCE((value->>'value')::numeric, flat_rate) INTO flat_rate FROM public.store_settings WHERE key = 'shipping_flat_rate';
  IF pay_method = 'cod' THEN
    SELECT COALESCE((value->>'value')::numeric, 0) INTO cod_fee FROM public.store_settings WHERE key = 'shipping_cod_fee';
  END IF;

  v_order_number := 'SC' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint));

  INSERT INTO public.orders (
    order_number, user_id, customer_name, email, phone, address, city, state, pincode,
    items, subtotal, shipping, discount, total, coupon_code, status,
    payment_provider, payment_status, payment_method
  ) VALUES (
    v_order_number, _user_id,
    _customer->>'customer_name', _customer->>'email', _customer->>'phone',
    _customer->>'address', _customer->>'city', _customer->>'state', _customer->>'pincode',
    '[]'::jsonb, 0, 0, 0, 0, NULLIF(_coupon, ''), 'pending',
    CASE WHEN pay_method = 'cod' THEN 'cod' ELSE 'upi' END,
    CASE WHEN pay_method = 'cod' THEN 'cod_pending' ELSE 'pending' END,
    pay_method
  ) RETURNING id INTO new_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    qty := GREATEST(1, LEAST(99, COALESCE((it->>'qty')::int, 1)));
    SELECT * INTO prod FROM public.products WHERE slug = it->>'slug' FOR UPDATE;
    IF prod.id IS NULL OR NOT prod.is_active THEN
      RAISE EXCEPTION 'A product in your cart is no longer available';
    END IF;

    -- Pack-size pricing: the charged price always comes from the product row, never the browser.
    size_label := NULLIF(it->>'size', '');
    size_idx := NULL;
    size_price := NULL;
    size_stock := NULL;
    size_sku := NULL;
    IF size_label IS NOT NULL AND jsonb_typeof(prod.size_options) = 'array' AND jsonb_array_length(prod.size_options) > 0 THEN
      SELECT (ord - 1), (opt->>'price')::numeric,
             CASE WHEN opt ? 'stock' AND opt->>'stock' IS NOT NULL THEN (opt->>'stock')::int END,
             opt->>'sku'
        INTO size_idx, size_price, size_stock, size_sku
        FROM jsonb_array_elements(prod.size_options) WITH ORDINALITY AS t(opt, ord)
       WHERE opt->>'label' = size_label
       LIMIT 1;
    END IF;
    unit_price := COALESCE(size_price, prod.price);

    IF size_stock IS NOT NULL THEN
      IF size_stock < qty THEN
        RAISE EXCEPTION 'Only % left of % (%)', size_stock, prod.name, size_label;
      END IF;
      UPDATE public.products
         SET size_options = jsonb_set(size_options, ARRAY[size_idx::text, 'stock'], to_jsonb(size_stock - qty), false)
       WHERE id = prod.id;
      new_stock := prod.stock_quantity;
    ELSE
      IF prod.stock_quantity < qty THEN
        RAISE EXCEPTION 'Only % left of %', prod.stock_quantity, prod.name;
      END IF;
      new_stock := prod.stock_quantity - qty;
      UPDATE public.products SET stock_quantity = new_stock WHERE id = prod.id;
    END IF;

    v_subtotal := v_subtotal + unit_price * qty;

    INSERT INTO public.order_items (order_id, product_id, product_slug, name, sku, size, unit_price, qty, line_total, image_url)
    VALUES (new_order_id, prod.id, prod.slug, prod.name, COALESCE(size_sku, prod.sku), size_label, unit_price, qty, unit_price * qty, prod.image_url);

    INSERT INTO public.inventory_transactions (product_id, change, resulting_stock, reason, reference)
    VALUES (prod.id, -qty, new_stock, 'order', v_order_number);
  END LOOP;

  IF _coupon IS NOT NULL AND _coupon <> '' THEN
    SELECT * INTO cpn FROM public.coupons
      WHERE upper(code) = upper(_coupon) AND is_active
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
        AND (usage_limit IS NULL OR used_count < usage_limit);
    IF cpn.id IS NOT NULL AND v_subtotal >= cpn.min_order_amount THEN
      v_discount := CASE WHEN cpn.discount_type = 'percent'
                        THEN v_subtotal * cpn.discount_value / 100
                        ELSE cpn.discount_value END;
      IF cpn.max_discount IS NOT NULL THEN v_discount := LEAST(v_discount, cpn.max_discount); END IF;
      v_discount := ROUND(LEAST(v_discount, v_subtotal), 2);
      UPDATE public.coupons SET used_count = used_count + 1 WHERE id = cpn.id;
    END IF;
  END IF;

  v_shipping := CASE WHEN v_subtotal - v_discount >= free_above THEN 0 ELSE flat_rate END + cod_fee;
  v_total := ROUND(v_subtotal - v_discount + v_shipping, 2);

  UPDATE public.orders
     SET items = (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'slug', oi.product_slug, 'name', oi.name, 'size', oi.size, 'sku', oi.sku,
                    'qty', oi.qty, 'price', oi.unit_price)), '[]'::jsonb)
                  FROM public.order_items oi WHERE oi.order_id = new_order_id),
         subtotal = v_subtotal, discount = v_discount, shipping = v_shipping, total = v_total,
         coupon_code = CASE WHEN v_discount > 0 THEN upper(_coupon) ELSE NULL END
   WHERE id = new_order_id;

  INSERT INTO public.payments (order_id, method, amount, status)
  VALUES (new_order_id, pay_method, v_total, CASE WHEN pay_method = 'cod' THEN 'cod_pending' ELSE 'pending' END);

  INSERT INTO public.order_events (order_id, status, note)
  VALUES (new_order_id, 'pending', 'Order placed');

  INSERT INTO public.admin_notifications (type, title, body, link)
  VALUES ('order.created', 'New order ' || v_order_number || ' — ₹' || v_total,
          COALESCE(_customer->>'customer_name', '') || ' • ' || COALESCE(_customer->>'phone', ''),
          '/admin/orders');

  IF _user_id IS NOT NULL THEN
    DELETE FROM public.cart_items WHERE user_id = _user_id;
    INSERT INTO public.customer_notifications (user_id, title, body, link)
    VALUES (_user_id, 'Order ' || v_order_number || ' placed',
            'We have received your order. Total ₹' || v_total, '/orders/' || v_order_number);
  END IF;

  RETURN jsonb_build_object(
    'order_number', v_order_number, 'order_id', new_order_id,
    'subtotal', v_subtotal, 'discount', v_discount, 'shipping', v_shipping, 'total', v_total
  );
END;
$function$;