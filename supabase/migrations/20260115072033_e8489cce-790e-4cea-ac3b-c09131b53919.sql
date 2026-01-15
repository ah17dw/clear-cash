-- Add payment_day column to expense_items table
ALTER TABLE public.expense_items 
ADD COLUMN payment_day integer CHECK (payment_day >= 1 AND payment_day <= 31);