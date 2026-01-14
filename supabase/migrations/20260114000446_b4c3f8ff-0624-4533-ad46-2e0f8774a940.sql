-- Change token column from UUID to TEXT to support hex tokens
ALTER TABLE public.task_delegation_responses 
ALTER COLUMN token TYPE TEXT USING token::TEXT;