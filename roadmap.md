# Roadmap

## Current: One-message spec (Part A audit fixes → Part B round 4 → Part C price change)

### Part A — audit fixes (money & security)
- [ ] A1: fix place_order percentage coupon bug (percent vs percentage), CHECK constraint, normalise rows, matching rounding in cart.tsx, checkout total-mismatch safety net, report affected past orders
- [ ] A2: coupons privacy — is_public + assigned_user_id columns, new RLS policies, server-side coupon validation at checkout, review coupons private+assigned, place_order rejects other-account codes
- [ ] A3: enforce per_customer_limit + first_order_only (SWASTIK10 first order only), cart message
- [ ] A4: admin coupons page — used_count fix, edit is_public/first_order_only/per_customer_limit, show assigned email
- [ ] A5: shipping default flat_rate 100 → 49 in place_order; report saved settings; verify ₹380→₹49, ₹499→free
- [ ] A6: ItemList JSON-LD on /products
- [ ] A7: remove admin_rating mapping in products.server.ts; hide admin rating fields in product form

### Part B — round 4 design/conversion
- [ ] B1: established = 1976 everywhere (code + DB content), replace all "1968"/"58+ years", list changes
- [ ] B2: hero eyebrow "ESTD 1976"; subline exactly "Swastik 100% Pure Camphor — Trusted Since Generations."
- [ ] B3: header cart icon → lucide ShoppingCart (keep maroon button, gold badge, "Cart" text ≥1280px)
- [ ] B4: price/discount display hierarchy on all cards + PDP (big price w/ smaller ₹, struck MRP, green % OFF, savings lines, twin "2 jars separately" line, bigger photo badge)
- [ ] B5: honest buying cues (Only N left ≤10, COD if enabled, tax/secure/dispatch trust line, BEST SAVING ribbon computed)
- [ ] B6: all sliders autoplay on load, 5s loop, fade under reduced motion
- [ ] B7: spacing ~32px mobile / 48px desktop between Twin slider dots and POPULAR PACKS
- [ ] B8: slider subheadings 24/32px display font + "View all →" links
- [ ] B9: trust stats 5,000+ stores / Since 1976 / Pan-India; chips DMart, Ratnadeep, Reliance Bazaar, KPN Fresh
- [ ] B10: cart savings card large green style; "Total savings −₹X" above Total
- [ ] B11: te/hi translations for all new text

### Part C — price change
- [ ] C1: Bhimseni Twin 2×100g ₹490→₹499 (MRP 580) in DB size_options
- [ ] C2: steal_deal_min 500→499; remove hard-coded ₹500 texts
- [ ] C3: verify derived values (13% OFF, Save ₹41 (7%), strip "up to 15%")

### Verification & report
- [ ] Mobile 360/390px + 1440px checks, no overlap/scroll
- [ ] Run all Part A/B/C checks from spec and report results

## Pending from earlier
- [ ] Resend API key setup (user action needed)
- [ ] Publish site
