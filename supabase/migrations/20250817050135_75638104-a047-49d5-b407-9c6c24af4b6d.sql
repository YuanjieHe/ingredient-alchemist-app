-- Create utility function to promote users to admin (for initial setup)
-- This should only be used during initial setup or by existing admins

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(user_email text)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles 
  SET role = 'admin'
  FROM auth.users 
  WHERE profiles.user_id = auth.users.id 
  AND auth.users.email = user_email
  AND (
    -- Allow promotion if no admins exist yet (initial setup)
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin')
    OR 
    -- Or if current user is already an admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
  
  SELECT FOUND;
$$;

-- Create function to check current user's role (useful for UI)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
    'user'::public.user_role
  );
$$;