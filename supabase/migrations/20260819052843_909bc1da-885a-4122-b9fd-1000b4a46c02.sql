-- ============ helper role functions ============
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin','super_admin','product_manager','order_manager','support_staff'))
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

-- ============ products extensions ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS cost_price numeric,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weight_grams numeric,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_keywords text;

-- staff read/write policies for products
DROP POLICY IF EXISTS "Staff can view all products" ON public.products;
CREATE POLICY "Staff can view all products" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Product staff can insert products" ON public.products;
CREATE POLICY "Product staff can insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'product_manager'));
DROP POLICY IF EXISTS "Product staff can update products" ON public.products;
CREATE POLICY "Product staff can update products" ON public.products FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'product_manager'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'product_manager'));

-- ============ categories ============
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  image_url text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active categories are public" ON public.categories;
CREATE POLICY "Active categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Staff manage categories" ON public.categories;
CREATE POLICY "Staff manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'product_manager'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'product_manager'));

INSERT INTO public.categories (slug, name, sort_order) VALUES
  ('camphor','Camphor',1),('pooja-essentials','Pooja Essentials',2),('incense','Incense',3),
  ('diyas','Diyas',4),('religious-products','Religious Products',5),('other','Other Products',6)
ON CONFLICT (slug) DO NOTHING;

-- ============ inventory transactions ============
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change integer NOT NULL,
  resulting_stock integer NOT NULL,
  reason text NOT NULL,
  reference text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_tx_product_idx ON public.inventory_transactions(product_id, created_at DESC);
GRANT SELECT ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view inventory history" ON public.inventory_transactions;
CREATE POLICY "Staff view inventory history" ON public.inventory_transactions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- ============ orders extensions + timeline ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS courier text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS tax numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON public.order_events(order_id, created_at);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff view order events" ON public.order_events;
CREATE POLICY "Staff view order events" ON public.order_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Customers view their order events" ON public.order_events;
CREATE POLICY "Customers view their order events" ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Order staff can update orders" ON public.orders;
CREATE POLICY "Order staff can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'order_manager'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'order_manager'));

-- ============ coupons ============
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit integer,
  per_customer_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active coupons readable" ON public.coupons;
CREATE POLICY "Active coupons readable" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, max_discount)
VALUES ('SWASTIK10','percentage',10,0,NULL), ('POOJA15','percentage',15,999,NULL)
ON CONFLICT (code) DO NOTHING;

-- ============ banners / homepage ============
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  button_text text,
  link_url text,
  placement text NOT NULL DEFAULT 'hero',
  sort_order integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active banners are public" ON public.banners;
CREATE POLICY "Active banners are public" ON public.banners FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage banners" ON public.banners;
CREATE POLICY "Admins manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ============ store settings ============
CREATE TABLE IF NOT EXISTS public.store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings are public" ON public.store_settings;
CREATE POLICY "Settings are public" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage settings" ON public.store_settings;
CREATE POLICY "Admins manage settings" ON public.store_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.store_settings (key, value) VALUES
 ('shipping', '{"fee":50,"free_threshold":999,"estimated_days":"3-5 business days"}'::jsonb),
 ('business', '{"name":"Swastik Camphor","email":"info@swastikcamphor.in","phone":"+91 74168 86881","address":"Hyderabad, Telangana"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============ admin notifications ============
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_notifications_idx ON public.admin_notifications(is_read, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read notifications" ON public.admin_notifications;
CREATE POLICY "Staff read notifications" ON public.admin_notifications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Staff update notifications" ON public.admin_notifications;
CREATE POLICY "Staff update notifications" ON public.admin_notifications FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ audit log ============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log(created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit log" ON public.audit_log;
CREATE POLICY "Admins read audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============ profiles: email + status ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============ safe stock decrement ============
CREATE OR REPLACE FUNCTION public.decrement_stock(_slug text, _qty integer, _reference text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_stock integer; pid uuid;
BEGIN
  SELECT id, stock_quantity INTO pid, new_stock FROM public.products WHERE slug = _slug FOR UPDATE;
  IF pid IS NULL THEN RETURN NULL; END IF;
  new_stock := GREATEST(0, new_stock - GREATEST(_qty, 0));
  UPDATE public.products SET stock_quantity = new_stock WHERE id = pid;
  INSERT INTO public.inventory_transactions (product_id, change, resulting_stock, reason, reference)
  VALUES (pid, -_qty, new_stock, 'order', _reference);
  RETURN new_stock;
END;
$$;
REVOKE ALL ON FUNCTION public.decrement_stock(text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_stock(text, integer, text) TO service_role;

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();