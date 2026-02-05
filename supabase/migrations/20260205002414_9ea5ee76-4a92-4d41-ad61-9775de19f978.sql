-- Silence linter and make intent explicit: no direct client access
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'truelayer_oauth_states'
      AND policyname = 'No direct access'
  ) THEN
    EXECUTE 'CREATE POLICY "No direct access" ON public.truelayer_oauth_states FOR ALL USING (false) WITH CHECK (false)';
  END IF;
END
$do$;