-- Add linked_parent_id to expense_items for expenses that are "accounted for" in another expense
ALTER TABLE public.expense_items 
ADD COLUMN linked_parent_id UUID REFERENCES public.expense_items(id) ON DELETE SET NULL;