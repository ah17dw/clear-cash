-- Add frequency field to expense_items (monthly or annual)
ALTER TABLE public.expense_items 
ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly';

-- Update existing items: if they have a renewal_date, mark as annual
UPDATE public.expense_items 
SET frequency = 'annual' 
WHERE renewal_date IS NOT NULL;