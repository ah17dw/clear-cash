-- Add optional active date range to income and expenses (for temporary items)
ALTER TABLE public.income_sources
  ADD COLUMN IF NOT EXISTS start_date date NULL,
  ADD COLUMN IF NOT EXISTS end_date date NULL;

ALTER TABLE public.expense_items
  ADD COLUMN IF NOT EXISTS start_date date NULL,
  ADD COLUMN IF NOT EXISTS end_date date NULL;