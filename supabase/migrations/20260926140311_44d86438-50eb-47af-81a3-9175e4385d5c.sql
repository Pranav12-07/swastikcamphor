ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_options jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION private.place_order(
  _user_id uuid,
  _customer jsonb,
  _items jsonb,
  _coupon text,
  _payment_method text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  prod public.products%ROWTYPE;
  qty int;
  subtotal numeric := 0;
  shipping numeric := 0;
  discount numeric := 0;
  total numeric := 0;
  free_above numeric := 499;
  flat_rate numeric := 100;
  cod_fee numeric := 0;
  order_number text;
  new_order_id uuid;
  cpn public.coupons%ROWTYPE;
  new_stock int;
  pay_method text := COALESCE(NULLIF(_payment_method, ''), 'upi');
  size_label text;
  size_idx int;
  size_price numeric;
  size_stock int;
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

  order_number := 'SC' || upper(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint));

  INSERT INTO public.orders (
    order_number, user_id, customer_name, email, phone, address, city, state, pincode,
    items, subtotal, shipping, discount, total, coupon_code, status,
    payment_provider, payment_status, payment_method
  ) VALUES (
    order_number, _user_id,
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
    IF size_label IS NOT NULL AND jsonb_typeof(prod.size_options) = 'array' AND jsonb_array_length(prod.size_options) > 0 THEN
      SELECT (ord - 1), (opt->>'price')::numeric,
             CASE WHEN opt ? 'stock' AND opt->>'stock' IS NOT NULL THEN (opt->>'stock')::int END
        INTO size_idx, size_price, size_stock
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

    subtotal := subtotal + unit_price * qty;

    INSERT INTO public.order_items (order_id, product_id, product_slug, name, sku, size, unit_price, qty, line_total, image_url)
    VALUES (new_order_id, prod.id, prod.slug, prod.name, prod.sku, it->>'size', unit_price, qty, unit_price * qty, prod.image_url);

    INSERT INTO public.inventory_transactions (product_id, change, resulting_stock, reason, reference)
    VALUES (prod.id, -qty, new_stock, 'order', order_number);
  END LOOP;

  IF _coupon IS NOT NULL AND _coupon <> '' THEN
    SELECT * INTO cpn FROM public.coupons
      WHERE upper(code) = upper(_coupon) AND is_active
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
        AND (usage_limit IS NULL OR used_count < usage_limit);
    IF cpn.id IS NOT NULL AND subtotal >= cpn.min_order_amount THEN
      discount := CASE WHEN cpn.discount_type = 'percent'
                       THEN subtotal * cpn.discount_value / 100
                       ELSE cpn.discount_value END;
      IF cpn.max_discount IS NOT NULL THEN discount := LEAST(discount, cpn.max_discount); END IF;
      discount := ROUND(LEAST(discount, subtotal), 2);
      UPDATE public.coupons SET used_count = used_count + 1 WHERE id = cpn.id;
    END IF;
  END IF;

  shipping := CASE WHEN subtotal - discount >= free_above THEN 0 ELSE flat_rate END + cod_fee;
  total := ROUND(subtotal - discount + shipping, 2);

  UPDATE public.orders
     SET items = (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                    'slug', oi.product_slug, 'name', oi.name, 'size', oi.size,
                    'qty', oi.qty, 'price', oi.unit_price)), '[]'::jsonb)
                  FROM public.order_items oi WHERE oi.order_id = new_order_id),
         subtotal = subtotal, discount = discount, shipping = shipping, total = total,
         coupon_code = CASE WHEN discount > 0 THEN upper(_coupon) ELSE NULL END
   WHERE id = new_order_id;

  INSERT INTO public.payments (order_id, method, amount, status)
  VALUES (new_order_id, pay_method, total, CASE WHEN pay_method = 'cod' THEN 'cod_pending' ELSE 'pending' END);

  INSERT INTO public.order_events (order_id, status, note)
  VALUES (new_order_id, 'pending', 'Order placed');

  INSERT INTO public.admin_notifications (type, title, body, link)
  VALUES ('order.created', 'New order ' || order_number || ' — ₹' || total,
          COALESCE(_customer->>'customer_name', '') || ' • ' || COALESCE(_customer->>'phone', ''),
          '/admin/orders');

  IF _user_id IS NOT NULL THEN
    DELETE FROM public.cart_items WHERE user_id = _user_id;
    INSERT INTO public.customer_notifications (user_id, title, body, link)
    VALUES (_user_id, 'Order ' || order_number || ' placed',
            'We have received your order. Total ₹' || total, '/orders/' || order_number);
  END IF;

  RETURN jsonb_build_object(
    'order_number', order_number, 'order_id', new_order_id,
    'subtotal', subtotal, 'discount', discount, 'shipping', shipping, 'total', total
  );
END;
$$;

REVOKE ALL ON FUNCTION private.place_order(uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.place_order(uuid, jsonb, jsonb, text, text) TO service_role;