CREATE POLICY "product_images_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'product_manager')));

CREATE POLICY "product_images_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'product_manager')));

CREATE POLICY "product_images_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'product_manager')))
  WITH CHECK (bucket_id = 'product-images' AND (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'product_manager')));

CREATE POLICY "product_images_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'product_manager')));