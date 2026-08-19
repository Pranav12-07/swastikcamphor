INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = '24eg105b35@anurag.edu.in'
ON CONFLICT (user_id, role) DO NOTHING;