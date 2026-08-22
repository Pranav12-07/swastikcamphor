# Production Ecommerce Upgrade — Swastik Camphor

## Audit findings (what already exists and works)

- Storefront: home, shop, `/products` + `/products/<slug>`, cart, checkout, track order, account, orders, wishlist, blogs, contact — all live on the database.
- Admin portal: dashboard, products (with image upload to storage), inventory, orders + order detail, customers, coupons, categories, payments, reviews, blogs, banners, settings, notifications, audit log.
- Database: `products`, `orders`, `profiles`, `user_roles`, `categories`, `coupons`, `banners`, `inventory_transactions`, `order_events`, `admin_notifications`, `audit_log`, `product_reviews`, `wishlists`, `store_settings`, `chat_*`, `contact_submissions`.
- Auth with roles in a separate table, admin route gate, storage bucket for product images, order email notifications, UPI QR checkout.

## Real gaps to close

1. **No saved addresses** — checkout re-types the address every time.
2. **Cart is browser-only** — not synced across devices/sessions for logged-in users.
3. **Orders store items as JSON** — no `order_items` rows, so per-product sales reporting and stock reconciliation are weak.
4. **Payments live as columns on `orders`** — no payment record, no UTR uniqueness protection, no screenshot upload, no verification audit trail.
5. **No receipt/invoice** — customers get no downloadable invoice.
6. **No realtime** — admin order list and customer order status need manual refresh.
7. **Phone order tracking** — needs OTP protection before revealing order details.
8. **No customer notification centre** and no email retry queue.
9. **Stock is not reserved atomically** at order placement (oversell risk on concurrent orders).

## Build plan

### Phase 1 — Data layer (single migration set, reuses existing tables)
- `addresses` (user_id, label, name, phone, line1/2, city, state, pincode, is_default) + RLS per user.
- `cart_items` (user_id, product_id, size, qty, unique per user/product/size) + RLS per user.
- `order_items` (order_id, product_id, name/sku/size snapshot, unit_price, qty, line_total); backfill from existing `orders.items` JSON, keep the JSON column for compatibility.
- `payments` (order_id, method upi/cod, amount, upi_ref UNIQUE, screenshot_path, status, verified_by, verified_at, failure_reason).
- `customer_notifications` (user_id, title, body, link, read_at).
- `email_queue` (to, template, payload, status, attempts, last_error) for retry.
- Atomic `place_order` RPC: validates prices from the DB, checks + decrements stock in one transaction, writes order, order_items, payment row, status history, admin notification. Never trusts client-sent prices or totals.
- GRANTs + RLS on everything; admin access via the existing role check.

### Phase 2 — Checkout, payment, receipt
- Address book in checkout (pick saved / add new / set default).
- Server-side price and total recomputation; client totals are display-only.
- UPI flow: order created as `pending_payment`, dynamic QR, customer submits UTR + optional payment screenshot upload; duplicate UTR is rejected.
- Admin payment verification screen: approve → order `confirmed`, payment `verified`, stock committed, receipt generated, customer email + notification. Reject → reason recorded, stock released.
- HTML/PDF invoice at `/orders/<number>/receipt`, downloadable by the owner and admin.

### Phase 3 — Orders, tracking, realtime
- Customer order detail: full timeline from `order_events`, items, payment state, invoice download, cancel while pending.
- Guest phone tracking: enter phone → email/OTP verification → masked order summary only.
- Realtime subscriptions: admin order list and dashboard counters update live; customer order page updates status live.

### Phase 4 — Cart, profile, reliability
- Cart syncs to `cart_items` on login and merges with the guest cart.
- Profile: name, phone, addresses, order history, notification centre.
- Double-submit protection on every mutating button, real loading/empty/error states, and email retry through `email_queue`.

### Phase 5 — Verification
- End-to-end run: signup → browse → cart → checkout → UPI → admin verify → email + invoice → status updates → tracking, plus RLS checks that one customer cannot read another's orders.

## Technical notes
Everything stays inside the current stack: TanStack Start server functions, existing Supabase tables and role model, existing admin shell and design system. No parallel/duplicate systems, no redesign of pages that already work.
