ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway text NOT NULL DEFAULT 'phonepe',
  ADD COLUMN IF NOT EXISTS gateway_order_id text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS webhook_status text,
  ADD COLUMN IF NOT EXISTS raw jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payments_gateway_order_id_key
  ON public.payments (gateway_order_id) WHERE gateway_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments (order_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;