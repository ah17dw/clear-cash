-- Create table for manually entered credit report data from Experian
CREATE TABLE public.credit_report_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  lender TEXT,
  type TEXT NOT NULL DEFAULT 'credit_card',
  balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC,
  monthly_payment NUMERIC,
  account_status TEXT DEFAULT 'open',
  matched_debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL,
  last_verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for credit score history
CREATE TABLE public.credit_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  score_band TEXT,
  source TEXT DEFAULT 'experian',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_report_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_score_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_report_entries
CREATE POLICY "Users can view their own credit report entries"
ON public.credit_report_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit report entries"
ON public.credit_report_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit report entries"
ON public.credit_report_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit report entries"
ON public.credit_report_entries FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for credit_score_history
CREATE POLICY "Users can view their own credit score history"
ON public.credit_score_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit score history"
ON public.credit_score_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit score history"
ON public.credit_score_history FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_credit_report_entries_updated_at
BEFORE UPDATE ON public.credit_report_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();