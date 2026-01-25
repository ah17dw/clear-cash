-- Create table for connected bank accounts via Open Banking
CREATE TABLE public.connected_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  institution_id TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  consent_token TEXT NOT NULL,
  consent_expires_at TIMESTAMP WITH TIME ZONE,
  account_ids JSONB DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for synced bank accounts (individual accounts from a connection)
CREATE TABLE public.synced_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.connected_bank_accounts(id) ON DELETE CASCADE,
  external_account_id TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC,
  linked_savings_id UUID REFERENCES public.savings_accounts(id) ON DELETE SET NULL,
  linked_debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_account_id)
);

-- Create table for synced transactions
CREATE TABLE public.synced_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  synced_account_id UUID NOT NULL REFERENCES public.synced_bank_accounts(id) ON DELETE CASCADE,
  external_transaction_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  description TEXT,
  merchant_name TEXT,
  category TEXT,
  transaction_date DATE NOT NULL,
  booking_date DATE,
  status TEXT NOT NULL DEFAULT 'booked',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(synced_account_id, external_transaction_id)
);

-- Create table for synced standing orders
CREATE TABLE public.synced_standing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  synced_account_id UUID NOT NULL REFERENCES public.synced_bank_accounts(id) ON DELETE CASCADE,
  external_order_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  reference TEXT,
  payee_name TEXT,
  frequency TEXT,
  next_payment_date DATE,
  first_payment_date DATE,
  final_payment_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  linked_expense_id UUID REFERENCES public.expense_items(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(synced_account_id, external_order_id)
);

-- Enable RLS on all tables
ALTER TABLE public.connected_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synced_standing_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for connected_bank_accounts
CREATE POLICY "Authorized users can view their own connected accounts"
  ON public.connected_bank_accounts FOR SELECT
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can create their own connected accounts"
  ON public.connected_bank_accounts FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can update their own connected accounts"
  ON public.connected_bank_accounts FOR UPDATE
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can delete their own connected accounts"
  ON public.connected_bank_accounts FOR DELETE
  USING ((auth.uid() = user_id) AND is_authorized());

-- RLS policies for synced_bank_accounts
CREATE POLICY "Authorized users can view their own synced accounts"
  ON public.synced_bank_accounts FOR SELECT
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can create their own synced accounts"
  ON public.synced_bank_accounts FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can update their own synced accounts"
  ON public.synced_bank_accounts FOR UPDATE
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can delete their own synced accounts"
  ON public.synced_bank_accounts FOR DELETE
  USING ((auth.uid() = user_id) AND is_authorized());

-- RLS policies for synced_transactions
CREATE POLICY "Authorized users can view their own transactions"
  ON public.synced_transactions FOR SELECT
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can create their own transactions"
  ON public.synced_transactions FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can delete their own transactions"
  ON public.synced_transactions FOR DELETE
  USING ((auth.uid() = user_id) AND is_authorized());

-- RLS policies for synced_standing_orders
CREATE POLICY "Authorized users can view their own standing orders"
  ON public.synced_standing_orders FOR SELECT
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can create their own standing orders"
  ON public.synced_standing_orders FOR INSERT
  WITH CHECK ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can update their own standing orders"
  ON public.synced_standing_orders FOR UPDATE
  USING ((auth.uid() = user_id) AND is_authorized());

CREATE POLICY "Authorized users can delete their own standing orders"
  ON public.synced_standing_orders FOR DELETE
  USING ((auth.uid() = user_id) AND is_authorized());

-- Add triggers for updated_at
CREATE TRIGGER update_connected_bank_accounts_updated_at
  BEFORE UPDATE ON public.connected_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_synced_bank_accounts_updated_at
  BEFORE UPDATE ON public.synced_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_synced_standing_orders_updated_at
  BEFORE UPDATE ON public.synced_standing_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();