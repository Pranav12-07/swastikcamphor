-- A2/A3: coupon visibility, ownership and first-order columns
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS assigned_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false;

-- A1: normalise discount types, then lock the allowed values.
UPDATE public.coupons SET discount_type = 'percentage' WHERE discount_type = 'percent';
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percentage', 'fixed'));

-- Advertised codes are public; everything else (e.g. REVIEW- thank-you codes) stays private.
UPDATE public.coupons SET is_public = true WHERE code IN ('SWASTIK10', 'POOJA15');
UPDATE public.coupons SET first_order_only = true WHERE code = 'SWASTIK10';

-- Public read policy: only active, public, unassigned codes. Assigned codes readable by their owner only.
DROP POLICY IF EXISTS "Active coupons readable" ON public.coupons;
CREATE POLICY "Public coupons readable" ON public.coupons FOR SELECT TO anon, authenticated
  USING (is_active AND is_public AND assigned_user_id IS NULL);
CREATE POLICY "Assigned coupons readable by owner" ON public.coupons FOR SELECT TO authenticated
  USING (is_active AND assigned_user_id = auth.uid());

-- A1/A3/A5/C2: corrected order placement — percentage math, coupon ownership/limits, ₹49 shipping default, ₹499 Steal Deal default.
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
  flat_rate numeric := 49;
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
  size_pack int;
  unit_price numeric;
  v_has_twin boolean := false;
  v_steal numeric := 0;
  v_steal_enabled boolean := true;
  v_steal_amount numeric := 50;
  v_steal_min numeric := 499;
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
    size_pack := NULL;
    IF size_label IS NOT NULL AND jsonb_typeof(prod.size_options) = 'array' AND jsonb_array_length(prod.size_options) > 0 THEN
      SELECT (ord - 1), (opt->>'price')::numeric,
             CASE WHEN opt ? 'stock' AND opt->>'stock' IS NOT NULL THEN (opt->>'stock')::int END,
             opt->>'sku',
             CASE WHEN opt ? 'pack_count' AND opt->>'pack_count' IS NOT NULL THEN (opt->>'pack_count')::int END
        INTO size_idx, size_price, size_stock, size_sku, size_pack
        FROM jsonb_array_elements(prod.size_options) WITH ORDINALITY AS t(opt, ord)
       WHERE opt->>'label' = size_label
       LIMIT 1;
    END IF;
    unit_price := COALESCE(size_price, prod.price);

    IF COALESCE(size_pack, 0) >= 2 THEN
      v_has_twin := true;
    END IF;

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
    IF cpn.id IS NOT NULL THEN
      -- Private codes belong to exactly one account.
      IF cpn.assigned_user_id IS NOT NULL AND cpn.assigned_user_id IS DISTINCT FROM _user_id THEN
        RAISE EXCEPTION 'This code belongs to another account';
      END IF;
      -- First-order codes are only for customers with no previous orders.
      IF cpn.first_order_only AND _user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.user_id = _user_id AND o.status <> 'cancelled' AND o.id <> new_order_id
      ) THEN
        RAISE EXCEPTION 'This code is valid on your first order only';
      END IF;
      -- Per-customer usage cap across their previous orders.
      IF cpn.per_customer_limit IS NOT NULL AND _user_id IS NOT NULL AND (
        SELECT count(*) FROM public.orders o
        WHERE o.user_id = _user_id AND o.status <> 'cancelled' AND o.coupon_code = cpn.code AND o.id <> new_order_id
      ) >= cpn.per_customer_limit THEN
        RAISE EXCEPTION 'You have already used this code the maximum number of times';
      END IF;
      IF v_subtotal >= cpn.min_order_amount THEN
        -- Percentage codes take a percentage off, rounded to whole rupees;
        -- fixed codes take a flat amount off. Both are capped by max_discount and the subtotal.
        v_discount := CASE WHEN cpn.discount_type IN ('percent', 'percentage')
                           THEN ROUND(v_subtotal * cpn.discount_value / 100)
                           ELSE LEAST(cpn.discount_value, v_subtotal) END;
        IF cpn.max_discount IS NOT NULL THEN v_discount := LEAST(v_discount, cpn.max_discount); END IF;
        v_discount := ROUND(LEAST(v_discount, v_subtotal), 2);
        UPDATE public.coupons SET used_count = used_count + 1 WHERE id = cpn.id;
      END IF;
    END IF;
  END IF;

  -- Steal Deal: a Twin Pack in the cart earns an extra flat discount above the
  -- minimum subtotal. The customer always gets the bigger of coupon vs Steal Deal.
  SELECT COALESCE((value->>'value')::boolean, true) INTO v_steal_enabled FROM public.store_settings WHERE key = 'steal_deal_enabled';
  SELECT COALESCE((value->>'value')::numeric, 50) INTO v_steal_amount FROM public.store_settings WHERE key = 'steal_deal_amount';
  SELECT COALESCE((value->>'value')::numeric, 499) INTO v_steal_min FROM public.store_settings WHERE key = 'steal_deal_min';

  IF v_steal_enabled AND v_has_twin AND v_subtotal >= v_steal_min THEN
    v_steal := v_steal_amount;
  END IF;

  IF v_steal > v_discount THEN
    -- Steal Deal wins: release the coupon usage and forget the coupon.
    IF cpn.id IS NOT NULL AND v_discount > 0 THEN
      UPDATE public.coupons SET used_count = GREATEST(0, used_count - 1) WHERE id = cpn.id;
    END IF;
    v_discount := 0;
  ELSE
    v_steal := 0;
  END IF;

  v_shipping := CASE WHEN v_subtotal - v_discount >= free_above THEN 0 ELSE flat_rate END + cod_fee;
  v_total := ROUND(v_subtotal - v_discount - v_steal + v_shipping, 2);

  UPDATE public.orders
     SET items = (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'slug', oi.product_slug, 'name', oi.name, 'size', oi.size, 'sku', oi.sku,
                    'qty', oi.qty, 'price', oi.unit_price)), '[]'::jsonb)
                  FROM public.order_items oi WHERE oi.order_id = new_order_id),
         subtotal = v_subtotal, discount = v_discount, steal_deal_discount = v_steal,
         shipping = v_shipping, total = v_total,
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
    'subtotal', v_subtotal, 'discount', v_discount, 'steal_deal', v_steal,
    'shipping', v_shipping, 'total', v_total
  );
END;
$function$