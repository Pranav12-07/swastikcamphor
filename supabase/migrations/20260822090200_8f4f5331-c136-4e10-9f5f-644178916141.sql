insert into public.products (slug,name,short_description,description,price,compare_at_price,category,sizes,features,stock_quantity,low_stock_threshold,is_active,is_featured,is_bestseller,status,tax_rate)
values
 ('camphor-tablets','Swastik Camphor Tablets','Clean-burning pure camphor tablets for daily pooja and aarti.','Our signature 100% pure camphor tablets burn with a bright, steady flame and leave no residue. Ideal for daily pooja, aarti and temple use.',149,199,'camphor',ARRAY['50 g','100 g','250 g'],ARRAY['Residue-free clean burn','Bright steady flame','Fresh purifying fragrance'],120,10,true,true,true,'active',0),
 ('bhimseni-camphor','Swastik Bhimseni Camphor','Natural Bhimseni camphor crystals for rituals, Ayurveda and aromatherapy.','Made from natural camphor, Bhimseni crystals are prized for spiritual rituals, Ayurvedic preparations and aromatherapy.',299,379,'camphor',ARRAY['50 g','100 g'],ARRAY['100% natural camphor','Ayurvedic & aromatherapy grade','Cooling aroma'],80,10,true,true,false,'active',0),
 ('camphor-cones-blocks','Camphor Cones & Blocks','Long-lasting cones and slabs for temples, havan and pest control.','Dense camphor cones and blocks designed for longer burn time — perfect for temples, havan ceremonies and larger spaces.',249,320,'pooja-essentials',ARRAY['100 g','250 g','500 g'],ARRAY['Extended burn time','Great for large spaces','Natural insect repellent'],60,10,true,false,true,'active',0),
 ('pooja-gift-pack','Swastik Pooja Gift Pack','A premium hamper of camphor, brass lamp and dried flowers.','An elegant festive hamper containing pure camphor tablets, a small brass lamp and dried flowers — a thoughtful gift for Diwali and corporate gifting.',899,1199,'religious-products',ARRAY['Standard','Deluxe'],ARRAY['Festive premium packaging','Complete pooja essentials','Ready to gift'],35,5,true,true,false,'active',0)
on conflict (slug) do nothing;

insert into public.store_settings (key,value) values
 ('shipping_flat_rate','{"value":"49"}'::jsonb),
 ('shipping_free_above','{"value":"499"}'::jsonb),
 ('shipping_cod_fee','{"value":"0"}'::jsonb),
 ('shipping_eta','{"value":"3-5 business days"}'::jsonb)
on conflict (key) do nothing;