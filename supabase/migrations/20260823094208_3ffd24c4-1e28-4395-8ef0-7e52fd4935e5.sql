ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_confirmation_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_notification_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method text;