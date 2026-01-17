-- Add bank_account field to debts table
ALTER TABLE public.debts
ADD COLUMN bank_account TEXT;