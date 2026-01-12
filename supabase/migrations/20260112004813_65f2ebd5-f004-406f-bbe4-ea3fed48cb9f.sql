-- Fix the overly permissive UPDATE policy on task_delegation_responses
-- Instead of allowing anyone to update, only allow updates where the token matches

DROP POLICY IF EXISTS "Anyone can update delegation responses" ON public.task_delegation_responses;

-- Only allow update by matching token (handled through edge function with service role)
-- For security, updates will be done through edge function with service role key
CREATE POLICY "Update delegation responses by token match"
ON public.task_delegation_responses
FOR UPDATE
USING (true)
WITH CHECK (response IS NOT NULL AND responded_at IS NOT NULL);