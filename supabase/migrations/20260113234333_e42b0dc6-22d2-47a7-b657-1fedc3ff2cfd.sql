-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy to audit_log for admin access
CREATE POLICY "Admins can view all audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Create a view for admin to see user details (joining with auth.users via profiles)
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
    p.user_id,
    p.display_name,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.email_confirmed_at,
    COALESCE(
        (SELECT array_agg(ur.role) FROM public.user_roles ur WHERE ur.user_id = p.user_id),
        ARRAY[]::app_role[]
    ) as roles
FROM public.profiles p
JOIN auth.users au ON au.id = p.user_id;

-- Grant access to the view for authenticated users (RLS on underlying tables will apply)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Assign admin role to Alex@hayesalex.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'alex@hayesalex.com'
ON CONFLICT (user_id, role) DO NOTHING;