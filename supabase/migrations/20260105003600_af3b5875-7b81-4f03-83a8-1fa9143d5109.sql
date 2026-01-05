-- Create task_history table to track task events
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'completed', 'delegated', 'accepted', 'rejected'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history for their own tasks or tasks they're tagged in
CREATE POLICY "Users can view task history for accessible tasks" ON public.task_history
  FOR SELECT USING (
    user_id = auth.uid() 
    OR task_id IN (
      SELECT id FROM public.tasks WHERE user_id = auth.uid()
    )
    OR task_id IN (
      SELECT task_id FROM public.task_tags WHERE tagged_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can insert history for their own actions
CREATE POLICY "Users can insert their own task history" ON public.task_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add delegation_status to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS delegation_status TEXT DEFAULT 'none';
-- Values: 'none', 'pending', 'accepted', 'rejected'

-- Add completed_at to tasks for tracking completion time
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Index for faster task history queries
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_user_id ON public.task_history(user_id);