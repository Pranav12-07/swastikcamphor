# Roadmap — Catalogue restructure (3 products with pack options)

## Done
- Mobile-first spec: one-line tappable offer strip, new header + drawer menu, two-line hero, 3 category circles, Twin Pack / single-pack card rows with Add to cart + Buy now, India trust stats, floating-button cleanup, Telugu/Hindi strings — verified at 360/390/1280/1440, build OK.
- DB: 3 master products (tablets / bhimseni / refill pouch), 16 pack options each with own price/MRP/stock/photo/SKU; old 18 listings disabled; reviews & wishlists moved; place_order enforces pack price + per-pack stock + pack SKU; review_votes + review_requests tables; private review-photos bucket.
- Product page: 301 redirects from old slugs, pack pills (Twin Packs first, gold border, % off), price block with % off + per-100g + savings, upsell, trust row, details table, how-to-use/safety, per-pack gallery image, sticky gallery, JSON-LD AggregateOffer + shipping.
- Reviews: verified badge, helpful votes, sort + photo/star filters, breakdown, store reply, photo reviews (private storage), ?review=1 form, pack selector.
- ProductCard: pack mode with selector, % off badge, per-100g, savings, Select options.
- Homepage: new title/hero/meta, Twin Pack Offers strip, Popular packs, Best value ribbon.
- /products: 3 sections + sticky chips. Cart: old slugs auto-migrated.
- Build OK.

## Remaining
- shop.tsx: align with 3-product catalogue.
- cart.tsx: "switch to Twin Pack & save" suggestions.
- Admin ProductForm: new size-table fields (short label, grams, container, SKU, photo, flags) + marketplace settings card.
- Admin reviews: reply box + QR share card; admin order page: WhatsApp review-request button.
- legacy-redirects.ts: WordPress /product/* rules; sitemap: image entries.
- Review-request automation: /api/public/cron/review-requests + pg_cron (needs publish).
- Publish everything; Resend setup still blocks order emails.
