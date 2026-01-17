-- Add bank_account field to expense_items table
ALTER TABLE public.expense_items 
ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- Add bank_account field to income_sources table  
ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS bank_account TEXT;

-- Add payment_day to income_sources for tracking when income arrives
ALTER TABLE public.income_sources
ADD COLUMN IF NOT EXISTS payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 31);

-- Create index for filtering by bank account
CREATE INDEX IF NOT EXISTS idx_expense_items_bank_account ON public.expense_items(bank_account);
CREATE INDEX IF NOT EXISTS idx_income_sources_bank_account ON public.income_sources(bank_account);