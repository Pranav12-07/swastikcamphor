ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'product_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'order_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_staff';