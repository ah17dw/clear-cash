-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view their own or tagged tasks" ON public.tasks;

-- Create a simple, non-recursive policy for SELECT
CREATE POLICY "Users can view their own tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = user_id);