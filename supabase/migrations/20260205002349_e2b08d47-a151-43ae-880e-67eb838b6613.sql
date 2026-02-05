-- Store short-lived OAuth state for completing TrueLayer auth without relying on browser session
CREATE TABLE IF NOT EXISTS public.truelayer_oauth_states (
  state uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  provider_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL
);

-- Lock down access from clients (service role bypasses RLS)
ALTER TABLE public.truelayer_oauth_states ENABLE ROW LEVEL SECURITY;

-- Helpful index for debugging/cleanup
CREATE INDEX IF NOT EXISTS truelayer_oauth_states_user_id_idx ON public.truelayer_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS truelayer_oauth_states_expires_at_idx ON public.truelayer_oauth_states(expires_at);
