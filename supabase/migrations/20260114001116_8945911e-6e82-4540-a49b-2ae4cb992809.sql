-- Tighten RLS on task_delegation_responses: this table is managed by backend functions only.
-- Public UPDATE/SELECT policies are unsafe because tokens can be brute-forced/leaked.

DROP POLICY IF EXISTS "Anyone can read delegation responses by token" ON public.task_delegation_responses;
DROP POLICY IF EXISTS "Update delegation responses by token match" ON public.task_delegation_responses;
DROP POLICY IF EXISTS "Users can create delegation responses for their tasks" ON public.task_delegation_responses;