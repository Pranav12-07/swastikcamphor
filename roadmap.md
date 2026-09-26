# Roadmap — Swastik Camphor store

## Done (this round)
- Steal Deal: server-enforced in place_order (Twin Pack + order ₹500+ → extra ₹50, always the bigger of coupon vs deal), stored on the order, shown in cart/checkout summaries, customer + admin emails, and PDF receipts.
- Twin Pack upsell popup when a single jar is added (once per product), plus "Switch to Twin Pack" buttons and a Steal Deal progress bar on the cart page.
- Homepage: hero CTAs, category circles reordered (Tablets, Bhimseni, Pouch), 9-pack auto-scrolling carousel (2 visible on phones, 4 on desktop, pause on hover/touch, arrows + dots + play/pause).
- /products rebuilt: filter chips (All / Twin Pack Offers / Tablets / Bhimseni / Pouch) with counts, sort dropdown (recommended, price low/high, biggest saving), URL-backed state, empty state; SSR loader/meta preserved.
- Shop page removed: /shop 301-redirects to /products (old ?category= maps to ?filter=), all nav/footer/blog/cart links updated, sitemap + legacy redirects cleaned.
- Product cards show real review stars/counts (fallback text when none) and genuine rounded purchase counts from recent paid/delivered orders; admin-set ratings cleared from the DB.
- Review coupons: approving a first review auto-creates a single-use ₹25 coupon (min ₹299, 60 days) and emails a branded thank-you; coupon marker exposed in review data.
- Footer top gap removed; build OK.

## Remaining
- Trust strip text: 200+ stores, ESTD 1968, partner list (Ratnadeep, Q Mart, Balaji Grand, Vijetha, SMR Vinay) — config values still 5,000+.
- Order-success page: show Steal Deal line (getPaymentState now returns it); admin order detail page Steal Deal line.
- Admin settings: editable Steal Deal (enabled/amount/min) + review-coupon programme controls; admin reviews: show coupon marker.
- Product page: no-review fallback text, review-coupon incentive line, Buy Now must skip the upsell popup.
- Telugu/Hindi translations for all new strings.
- Full responsive + accessibility check (360/390/768/1280/1440), carousel geometry test.
- Review-request cron + publish; Resend setup still blocks order emails.
