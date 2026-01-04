-- Sub-expenses table (child items for parent expenses)
CREATE TABLE public.sub_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_expense_id UUID NOT NULL REFERENCES public.expense_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sub_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sub-expenses"
ON public.sub_expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sub-expenses"
ON public.sub_expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub-expenses"
ON public.sub_expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub-expenses"
ON public.sub_expenses FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_sub_expenses_updated_at
BEFORE UPDATE ON public.sub_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications table for in-app alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add display_name to profiles for user search
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Allow users to search other users by display_name for task delegation
CREATE POLICY "Users can view other profiles for search"
ON public.profiles FOR SELECT
USING (true);

-- Update task_tags to allow tagged users to see tasks tagged to them
DROP POLICY IF EXISTS "Task owners can view tags on their tasks" ON public.task_tags;
CREATE POLICY "Users can view task tags"
ON public.task_tags FOR SELECT
USING (
  created_by = auth.uid() 
  OR tagged_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND t.user_id = auth.uid())
);

-- Allow tagged users to view tasks they are tagged on
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own or tagged tasks"
ON public.tasks FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM task_tags tt 
    WHERE tt.task_id = id 
    AND tt.tagged_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);