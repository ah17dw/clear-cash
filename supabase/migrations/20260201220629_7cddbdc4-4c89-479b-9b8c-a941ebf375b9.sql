-- Add unique constraint on external_account_id for upsert to work
ALTER TABLE public.synced_bank_accounts
ADD CONSTRAINT synced_bank_accounts_external_account_id_key UNIQUE (external_account_id);

-- Add unique constraint on external_transaction_id for transaction upsert
ALTER TABLE public.synced_transactions
ADD CONSTRAINT synced_transactions_external_transaction_id_key UNIQUE (external_transaction_id);

-- Add unique constraint on external_order_id for standing orders upsert
ALTER TABLE public.synced_standing_orders
ADD CONSTRAINT synced_standing_orders_external_order_id_key UNIQUE (external_order_id);