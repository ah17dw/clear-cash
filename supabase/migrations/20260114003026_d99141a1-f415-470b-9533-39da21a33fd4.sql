-- Phase 1.1: Fix Profiles Table Data Exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view other profiles for search" ON public.profiles;

-- Create a secure RPC function that only returns safe fields
CREATE OR REPLACE FUNCTION public.search_users(search_term text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id != auth.uid()
    AND p.display_name ILIKE '%' || search_term || '%'
  LIMIT 10;
$$;

-- Phase 1.2: Implement Server-Side Authorization
-- Create authorized_users table
CREATE TABLE IF NOT EXISTS public.authorized_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on authorized_users
ALTER TABLE public.authorized_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage authorized users
CREATE POLICY "Admins can view authorized users"
ON public.authorized_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert authorized users"
ON public.authorized_users
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete authorized users"
ON public.authorized_users
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert the currently authorized email
INSERT INTO public.authorized_users (email) VALUES ('alex@hayesalex.com')
ON CONFLICT (email) DO NOTHING;

-- Create is_authorized function
CREATE OR REPLACE FUNCTION public.is_authorized()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authorized_users
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  )
$$;

-- Phase 2.1: Add RLS Policies to task_delegation_responses
-- Policy for task owners to view responses
CREATE POLICY "Task owners can view delegation responses"
ON public.task_delegation_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_delegation_responses.task_id
    AND t.user_id = auth.uid()
  )
);

-- Phase 2.2: Add INSERT Policy to notifications
-- Allow authenticated users to insert notifications for themselves or via triggers
CREATE POLICY "Users can create notifications for themselves"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());