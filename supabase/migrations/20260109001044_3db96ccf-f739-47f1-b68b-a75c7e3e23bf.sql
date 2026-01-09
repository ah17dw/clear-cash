-- Create table for storing multiple files per renewal
CREATE TABLE public.renewal_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  renewal_id UUID NOT NULL REFERENCES public.renewals(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.renewal_files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own renewal files" 
ON public.renewal_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own renewal files" 
ON public.renewal_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own renewal files" 
ON public.renewal_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_renewal_files_renewal_id ON public.renewal_files(renewal_id);

-- Also add a person_or_address column to renewals for filtering by who
ALTER TABLE public.renewals ADD COLUMN person_or_address TEXT;