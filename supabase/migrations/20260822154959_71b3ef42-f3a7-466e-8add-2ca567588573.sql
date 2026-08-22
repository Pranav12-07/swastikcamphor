
CREATE OR REPLACE FUNCTION private.place_order(_user_id uuid, _customer jsonb, _items jsonb, _coupon text, _payment_method text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  it jsonb;
  prod public.products%ROWTYPE;
  v_qty int;
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
    payment_provider, payment_status
  ) VALUES (
    v_order_number, _user_id,
    _customer->>'customer_name', _customer->>'email', _customer->>'phone',
    _customer->>'address', _customer->>'city', _customer->>'state', _customer->>'pincode',
    '[]'::jsonb, 0, 0, 0, 0, NULLIF(_coupon, ''), 'pending',
    CASE WHEN pay_method = 'cod' THEN 'cod' ELSE 'upi' END,
    CASE WHEN pay_method = 'cod' THEN 'cod_pending' ELSE 'pending' END
  ) RETURNING id INTO new_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := GREATEST(1, LEAST(99, COALESCE((it->>'qty')::int, 1)));
    SELECT * INTO prod FROM public.products WHERE slug = it->>'slug' FOR UPDATE;
    IF prod.id IS NULL OR NOT prod.is_active THEN
      RAISE EXCEPTION 'A product in your cart is no longer available';
    END IF;
    IF prod.stock_quantity < v_qty THEN
      RAISE EXCEPTION 'Only % left of %', prod.stock_quantity, prod.name;
    END IF;

    v_subtotal := v_subtotal + prod.price * v_qty;

    INSERT INTO public.order_items (order_id, product_id, product_slug, name, sku, size, unit_price, qty, line_total, image_url)
    VALUES (new_order_id, prod.id, prod.slug, prod.name, prod.sku, it->>'size', prod.price, v_qty, prod.price * v_qty, prod.image_url);

    new_stock := prod.stock_quantity - v_qty;
    UPDATE public.products SET stock_quantity = new_stock WHERE id = prod.id;
    INSERT INTO public.inventory_transactions (product_id, change, resulting_stock, reason, reference)
    VALUES (prod.id, -v_qty, new_stock, 'order', v_order_number);
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
                    'slug', oi.product_slug, 'name', oi.name, 'size', oi.size,
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
