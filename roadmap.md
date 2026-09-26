# Roadmap

## Round 4 (audit fixes + design + prices)
- [x] A1 Percentage coupons charged correctly in place_order (percent/percentage), whole-rupee rounding, caps
- [x] A2 Private coupons (is_public, assigned_user_id) + server-side validation; catalog sees public only
- [x] A3 per_customer_limit + first_order_only enforced server-side (SWASTIK10 first order)
- [x] A4 Admin coupons: used_count fixed; is_public/first_order_only/per_customer_limit/assigned email shown
- [x] A5 Shipping default ₹49 (store setting wins)
- [x] A6 /products ItemList JSON-LD
- [x] A7 Ratings only from approved reviews; admin rating fields removed
- [x] B1 1976 everywhere (code + DB descriptions)
- [x] B2 Hero "ESTD 1976" + exact subline
- [x] B3 Cart icon → ShoppingCart
- [x] B4 Price hierarchy on cards + PDP (PriceTag, MRP, % OFF, savings lines)
- [x] B5 Honest cues: Only N left (≤10), BEST SAVING ribbon, real bought counts
- [x] B6 Sliders autoplay 5s; reduced-motion fade instead of stop
- [x] B7 Spacing above POPULAR PACKS
- [x] B8 Bigger subheadings + View all → links
- [x] B9 Trust: 5,000+ stores, Since 1976, DMart/Ratnadeep/Reliance Bazaar/KPN Fresh
- [x] B10 Cart savings card + Total savings −₹X above Total
- [x] B11 te/hi translations for new text
- [x] C1 Bhimseni 2×100g Twin ₹499 (MRP ₹580)
- [x] C2 steal_deal_min → ₹499
- [x] C3 All amounts from prices/settings (ticker derives max twin %)

## Outstanding
- [ ] Publish the site
- [ ] Resend API key + domain verification (user action needed)
- [ ] Final phone/desktop visual pass after publish
