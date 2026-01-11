-- Add frequency column to renewals for payment schedule (weekly, monthly, annually)
ALTER TABLE public.renewals 
ADD COLUMN frequency text NOT NULL DEFAULT 'annually';

-- Add comment for clarity
COMMENT ON COLUMN public.renewals.frequency IS 'Payment frequency: weekly, monthly, annually';