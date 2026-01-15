-- Add separate flag to show a renewal in Cashflow without linking/duplicating it as an expense
ALTER TABLE public.renewals
ADD COLUMN IF NOT EXISTS show_in_cashflow BOOLEAN NOT NULL DEFAULT false;