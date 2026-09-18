-- Durable rate limiting for serverless deployments.
-- Only the server/service role may use these counters.

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at
  ON public.rate_limit_buckets (reset_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limit_buckets
FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_max INTEGER,
  p_window_ms BIGINT
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_count INTEGER;
  v_reset TIMESTAMPTZ;
BEGIN
  INSERT INTO public.rate_limit_buckets (
    bucket_key,
    request_count,
    reset_at
  )
  VALUES (
    p_key,
    1,
    v_now + (p_window_ms * INTERVAL '1 millisecond')
  )
  ON CONFLICT (bucket_key)
  DO UPDATE SET
    request_count =
      CASE
        WHEN rate_limit_buckets.reset_at <= v_now
          THEN 1
        ELSE rate_limit_buckets.request_count + 1
      END,
    reset_at =
      CASE
        WHEN rate_limit_buckets.reset_at <= v_now
          THEN v_now + (p_window_ms * INTERVAL '1 millisecond')
        ELSE rate_limit_buckets.reset_at
      END
  RETURNING
    request_count,
    reset_at
  INTO
    v_count,
    v_reset;

  allowed := v_count <= p_max;

  retry_after_seconds :=
    GREATEST(
      1,
      CEIL(
        EXTRACT(EPOCH FROM (v_reset - v_now))
      )::INTEGER
    );

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(
  TEXT,
  INTEGER,
  BIGINT
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(
  TEXT,
  INTEGER,
  BIGINT
)
TO service_role;