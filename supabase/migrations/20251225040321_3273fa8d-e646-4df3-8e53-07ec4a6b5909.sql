-- Admin sidebar badge read-state
CREATE TABLE IF NOT EXISTS public.admin_badge_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_key TEXT NOT NULL,
  seen_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_badge_reads_user_badge_key UNIQUE (user_id, badge_key)
);

ALTER TABLE public.admin_badge_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own admin badge reads"
ON public.admin_badge_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own admin badge reads"
ON public.admin_badge_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own admin badge reads"
ON public.admin_badge_reads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own admin badge reads"
ON public.admin_badge_reads
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_admin_badge_reads_user_id ON public.admin_badge_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_badge_reads_user_id_badge_key ON public.admin_badge_reads(user_id, badge_key);