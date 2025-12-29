-- Create debts table
CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit_card',
  lender TEXT,
  starting_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  apr DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_promo_0 BOOLEAN NOT NULL DEFAULT false,
  promo_start_date DATE,
  promo_end_date DATE,
  post_promo_apr DECIMAL(5,2),
  payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 28),
  minimum_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  planned_payment DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create debt_payments table
CREATE TABLE public.debt_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  paid_on DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings_accounts table
CREATE TABLE public.savings_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  aer DECIMAL(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings_transactions table
CREATE TABLE public.savings_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  savings_account_id UUID NOT NULL REFERENCES public.savings_accounts(id) ON DELETE CASCADE,
  trans_on DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create income_sources table
CREATE TABLE public.income_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense_items table
CREATE TABLE public.expense_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for debts
CREATE POLICY "Users can view their own debts" ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own debts" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debts" ON public.debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debts" ON public.debts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for debt_payments
CREATE POLICY "Users can view their own debt payments" ON public.debt_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own debt payments" ON public.debt_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own debt payments" ON public.debt_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own debt payments" ON public.debt_payments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for savings_accounts
CREATE POLICY "Users can view their own savings accounts" ON public.savings_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own savings accounts" ON public.savings_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own savings accounts" ON public.savings_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own savings accounts" ON public.savings_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for savings_transactions
CREATE POLICY "Users can view their own savings transactions" ON public.savings_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own savings transactions" ON public.savings_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own savings transactions" ON public.savings_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own savings transactions" ON public.savings_transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for income_sources
CREATE POLICY "Users can view their own income sources" ON public.income_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own income sources" ON public.income_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income sources" ON public.income_sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own income sources" ON public.income_sources FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for expense_items
CREATE POLICY "Users can view their own expense items" ON public.expense_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own expense items" ON public.expense_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expense items" ON public.expense_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expense items" ON public.expense_items FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_savings_accounts_updated_at BEFORE UPDATE ON public.savings_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_income_sources_updated_at BEFORE UPDATE ON public.income_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_items_updated_at BEFORE UPDATE ON public.expense_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();