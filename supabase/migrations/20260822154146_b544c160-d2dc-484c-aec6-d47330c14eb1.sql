
-- ADDRESSES ------------------------------------------------------------
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  full_name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON public.addresses(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CART -----------------------------------------------------------------
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  size text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0 AND qty <= 99),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug, size)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDER ITEMS ----------------------------------------------------------
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_slug text NOT NULL,
  name text NOT NULL,
  sku text,
  size text,
  unit_price numeric NOT NULL,
  qty integer NOT NULL,
  line_total numeric NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "staff read order items" ON public.order_items FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- PAYMENTS -------------------------------------------------------------
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'upi',
  amount numeric NOT NULL,
  upi_ref text UNIQUE,
  screenshot_path text,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON public.payments(order_id);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CUSTOMER NOTIFICATIONS ----------------------------------------------
CREATE TABLE public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_notifications_user ON public.customer_notifications(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications read" ON public.customer_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.customer_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EMAIL QUEUE ----------------------------------------------------------
CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read email queue" ON public.email_queue FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));
CREATE TRIGGER email_queue_updated_at BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BACKFILL ORDER ITEMS FROM EXISTING JSON ------------------------------
INSERT INTO public.order_items (order_id, product_slug, name, size, unit_price, qty, line_total)
SELECT o.id,
       COALESCE(it->>'slug', ''),
       COALESCE(it->>'name', 'Item'),
       it->>'size',
       COALESCE((it->>'price')::numeric, 0),
       COALESCE((it->>'qty')::int, (it->>'quantity')::int, 1),
       COALESCE((it->>'price')::numeric, 0) * COALESCE((it->>'qty')::int, (it->>'quantity')::int, 1)
FROM public.orders o
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END) AS it;

INSERT INTO public.payments (order_id, method, amount, upi_ref, status, created_at)
SELECT o.id,
       COALESCE(o.payment_provider, 'upi'),
       o.total,
       NULL,
       CASE WHEN o.payment_status IN ('paid','verified') THEN 'verified' ELSE 'pending' END,
       o.created_at
FROM public.orders o;

-- ATOMIC ORDER PLACEMENT ----------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(
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
    payment_provider, payment_status
  ) VALUES (
    order_number, _user_id,
    _customer->>'customer_name', _customer->>'email', _customer->>'phone',
    _customer->>'address', _customer->>'city', _customer->>'state', _customer->>'pincode',
    '[]'::jsonb, 0, 0, 0, 0, NULLIF(_coupon, ''), 'pending',
    CASE WHEN pay_method = 'cod' THEN 'cod' ELSE 'upi' END,
    CASE WHEN pay_method = 'cod' THEN 'cod_pending' ELSE 'pending' END
  ) RETURNING id INTO new_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    qty := GREATEST(1, LEAST(99, COALESCE((it->>'qty')::int, 1)));
    SELECT * INTO prod FROM public.products WHERE slug = it->>'slug' FOR UPDATE;
    IF prod.id IS NULL OR NOT prod.is_active THEN
      RAISE EXCEPTION 'A product in your cart is no longer available';
    END IF;
    IF prod.stock_quantity < qty THEN
      RAISE EXCEPTION 'Only % left of %', prod.stock_quantity, prod.name;
    END IF;

    subtotal := subtotal + prod.price * qty;

    INSERT INTO public.order_items (order_id, product_id, product_slug, name, sku, size, unit_price, qty, line_total, image_url)
    VALUES (new_order_id, prod.id, prod.slug, prod.name, prod.sku, it->>'size', prod.price, qty, prod.price * qty, prod.image_url);

    new_stock := prod.stock_quantity - qty;
    UPDATE public.products SET stock_quantity = new_stock WHERE id = prod.id;
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

REVOKE ALL ON FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, jsonb, jsonb, text, text) TO service_role;
