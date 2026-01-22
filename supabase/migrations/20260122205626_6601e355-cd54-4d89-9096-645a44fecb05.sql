-- Create credit report uploads history table
CREATE TABLE public.credit_report_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_names TEXT[] NOT NULL,
  entries_found INTEGER NOT NULL DEFAULT 0,
  discrepancies_found INTEGER NOT NULL DEFAULT 0,
  updates_applied INTEGER NOT NULL DEFAULT 0,
  raw_results JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_report_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own credit report uploads"
ON public.credit_report_uploads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit report uploads"
ON public.credit_report_uploads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit report uploads"
ON public.credit_report_uploads
FOR DELETE
USING (auth.uid() = user_id);