-- Create renewals table for contracts/agreements
CREATE TABLE public.renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  provider TEXT,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  is_monthly_payment BOOLEAN NOT NULL DEFAULT true,
  agreement_start DATE,
  agreement_end DATE,
  notes TEXT,
  file_url TEXT,
  file_name TEXT,
  added_to_expenses BOOLEAN NOT NULL DEFAULT false,
  linked_expense_id UUID REFERENCES public.expense_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own renewals" 
ON public.renewals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own renewals" 
ON public.renewals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own renewals" 
ON public.renewals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own renewals" 
ON public.renewals FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_renewals_updated_at
BEFORE UPDATE ON public.renewals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for renewal files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('renewal-files', 'renewal-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for renewal files
CREATE POLICY "Users can upload renewal files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'renewal-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their renewal files"
ON storage.objects FOR SELECT
USING (bucket_id = 'renewal-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their renewal files"
ON storage.objects FOR DELETE
USING (bucket_id = 'renewal-files' AND auth.uid()::text = (storage.foldername(name))[1]);