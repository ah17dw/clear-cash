-- Create audit log table for tracking all changes
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete'
  entity_type VARCHAR(50) NOT NULL, -- 'task', 'debt', 'expense', 'income', 'savings', 'renewal', etc.
  entity_id UUID NOT NULL,
  entity_name TEXT, -- Human readable name of the item
  changes JSONB, -- What fields changed (for updates)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit log
CREATE POLICY "Users can view their own audit log"
ON public.audit_log
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own audit log entries
CREATE POLICY "Users can create their own audit log entries"
ON public.audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_audit_log_user_created ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_entity ON public.audit_log(user_id, entity_type, entity_id);

-- Add delegation response token and status update fields to tasks
-- Already has delegation_status but we need to add response tracking
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS delegation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS delegation_responded_at TIMESTAMP WITH TIME ZONE;

-- Create table for task delegation responses (so we can track who responded)
CREATE TABLE public.task_delegation_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  response VARCHAR(20), -- 'accepted', 'rejected', null if not responded
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on responses - public access needed for email link clicks
ALTER TABLE public.task_delegation_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can read responses by token (needed for email link verification)
CREATE POLICY "Anyone can read delegation responses by token"
ON public.task_delegation_responses
FOR SELECT
USING (true);

-- Anyone can update responses (needed for email link clicks)
CREATE POLICY "Anyone can update delegation responses"
ON public.task_delegation_responses
FOR UPDATE
USING (true);

-- Task owners can insert delegation responses
CREATE POLICY "Users can create delegation responses for their tasks"
ON public.task_delegation_responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = task_id AND user_id = auth.uid()
  )
);