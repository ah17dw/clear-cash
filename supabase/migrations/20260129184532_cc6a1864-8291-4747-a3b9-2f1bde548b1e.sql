-- Add provider column to track which open banking provider was used
ALTER TABLE public.connected_bank_accounts 
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'plaid';

-- Add requisition_id column for Nordigen connections
ALTER TABLE public.connected_bank_accounts 
ADD COLUMN IF NOT EXISTS requisition_id text;

-- Add index for provider lookups
CREATE INDEX IF NOT EXISTS idx_connected_bank_accounts_provider 
ON public.connected_bank_accounts(provider);