
-- ═══════════════════════════════════════════════════════════
-- Eliminate the Wrong Answer — Problem Type
-- ═══════════════════════════════════════════════════════════

-- 1. Main problems table
CREATE TABLE public.eliminate_wrong_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.practice_skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  language TEXT NOT NULL DEFAULT 'python',
  tags TEXT[] DEFAULT '{}'::text[],
  description TEXT DEFAULT '',
  context_code TEXT DEFAULT '',
  selection_mode TEXT NOT NULL DEFAULT 'single' CHECK (selection_mode IN ('single', 'multiple')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  shuffle_options BOOLEAN NOT NULL DEFAULT true,
  allow_partial_credit BOOLEAN NOT NULL DEFAULT false,
  allow_retry BOOLEAN NOT NULL DEFAULT true,
  explanation TEXT DEFAULT '',
  hints JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(slug)
);

-- 2. Mapping table (link to sub-topics)
CREATE TABLE public.eliminate_wrong_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eliminate_wrong_problem_id UUID NOT NULL REFERENCES public.eliminate_wrong_problems(id) ON DELETE CASCADE,
  sub_topic_id UUID NOT NULL REFERENCES public.sub_topics(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  context_note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Attempts table (learner progress)
CREATE TABLE public.eliminate_wrong_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  problem_id UUID NOT NULL REFERENCES public.eliminate_wrong_problems(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ RLS ═══

ALTER TABLE public.eliminate_wrong_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eliminate_wrong_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eliminate_wrong_attempts ENABLE ROW LEVEL SECURITY;

-- Problems: admins full access, published visible to all, moderators can manage own
CREATE POLICY "Admins can manage all eliminate wrong problems"
  ON public.eliminate_wrong_problems FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published eliminate wrong problems"
  ON public.eliminate_wrong_problems FOR SELECT
  USING (
    status = 'published'
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'moderator'::app_role) AND created_by = auth.uid())
  );

CREATE POLICY "Moderators can create eliminate wrong problems"
  ON public.eliminate_wrong_problems FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) AND created_by = auth.uid());

CREATE POLICY "Moderators can update own eliminate wrong problems"
  ON public.eliminate_wrong_problems FOR UPDATE
  USING (has_role(auth.uid(), 'moderator'::app_role) AND created_by = auth.uid());

-- Mappings: admins full, anyone can view, moderators can create/delete
CREATE POLICY "Admins can manage all eliminate wrong mappings"
  ON public.eliminate_wrong_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view eliminate wrong mappings"
  ON public.eliminate_wrong_mappings FOR SELECT
  USING (true);

CREATE POLICY "Moderators can create eliminate wrong mappings"
  ON public.eliminate_wrong_mappings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can delete eliminate wrong mappings"
  ON public.eliminate_wrong_mappings FOR DELETE
  USING (has_role(auth.uid(), 'moderator'::app_role));

-- Attempts: users manage own
CREATE POLICY "Users can view own eliminate wrong attempts"
  ON public.eliminate_wrong_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own eliminate wrong attempts"
  ON public.eliminate_wrong_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_eliminate_wrong_problems_skill ON public.eliminate_wrong_problems(skill_id);
CREATE INDEX idx_eliminate_wrong_problems_slug ON public.eliminate_wrong_problems(slug);
CREATE INDEX idx_eliminate_wrong_mappings_sub_topic ON public.eliminate_wrong_mappings(sub_topic_id);
CREATE INDEX idx_eliminate_wrong_attempts_user_problem ON public.eliminate_wrong_attempts(user_id, problem_id);

-- Updated_at trigger
CREATE TRIGGER update_eliminate_wrong_problems_updated_at
  BEFORE UPDATE ON public.eliminate_wrong_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
