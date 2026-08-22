DELETE FROM public.products WHERE slug = 'swastik-100-pure-bhimseni-camphor-100-grams-jar-copy-pv7v';

INSERT INTO public.products (slug, name, short_description, description, price, compare_at_price, sizes, features, category, stock_quantity, low_stock_threshold, is_active, is_featured, is_bestseller, status, sku)
VALUES
 ('camphor-tablets','Swastik Camphor Tablets','Clean-burning pure camphor tablets for daily pooja and aarti.','Our signature 100% pure camphor tablets burn with a bright, steady flame and leave no residue. Ideal for daily pooja, aarti and temple use, with a fresh, uplifting fragrance that purifies the surroundings.',149,199,ARRAY['50 g','100 g','250 g'],ARRAY['Daily Pooja','Temple Use','Home Fragrance'],'camphor',100,10,true,true,true,'active','SC-TAB-001'),
 ('bhimseni-camphor','Swastik Bhimseni Camphor','Natural Bhimseni camphor crystals for rituals, Ayurveda and aromatherapy.','Made from natural camphor, Bhimseni crystals are prized for spiritual rituals, traditional Ayurvedic preparations and aromatherapy. Cooling, aromatic and completely free of harmful additives.',299,379,ARRAY['50 g','100 g'],ARRAY['Aromatherapy','Meditation','Ayurveda'],'camphor',100,10,true,true,true,'active','SC-BHI-001'),
 ('camphor-cones-blocks','Camphor Cones & Blocks','Long-lasting cones and slabs for temples, havan and pest control.','Dense camphor cones and blocks designed for longer burn time — perfect for temples, havan ceremonies and larger spaces. Also widely used in wardrobes and storage areas as a natural insect repellent.',249,320,ARRAY['100 g','250 g','500 g'],ARRAY['Temple Use','Household Use','Wholesale Purchase'],'camphor',100,10,true,false,false,'active','SC-CON-001'),
 ('pooja-gift-pack','Swastik Pooja Gift Pack','A premium hamper of camphor, brass lamp and dried flowers.','An elegant festive hamper containing pure camphor tablets, a small brass lamp and dried flowers — a thoughtful gift for Diwali, housewarming ceremonies and corporate gifting.',899,1199,ARRAY['Standard','Deluxe'],ARRAY['Gift Packs','Daily Pooja','Temple Use'],'gift',50,5,true,true,false,'active','SC-GIFT-001')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  sizes = EXCLUDED.sizes,
  features = EXCLUDED.features,
  is_active = true,
  status = 'active';

INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, is_active)
VALUES ('SWASTIK10','percentage',10,0,true), ('POOJA15','percentage',15,999,true)
ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, is_active = true;