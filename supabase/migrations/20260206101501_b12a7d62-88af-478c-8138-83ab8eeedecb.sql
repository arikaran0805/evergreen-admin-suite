
-- =============================================
-- Predict the Output: Problem & Attempt Tables
-- =============================================

-- Table: predict_output_problems
CREATE TABLE public.predict_output_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.practice_skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  language TEXT NOT NULL DEFAULT 'python',
  tags TEXT[] DEFAULT '{}',
  prompt TEXT,
  code TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  accepted_outputs JSONB DEFAULT '[]',
  match_mode TEXT NOT NULL DEFAULT 'strict',
  output_type TEXT NOT NULL DEFAULT 'single_line',
  reveal_allowed BOOLEAN NOT NULL DEFAULT true,
  reveal_timing TEXT NOT NULL DEFAULT 'anytime',
  reveal_penalty TEXT NOT NULL DEFAULT 'no_xp',
  explanation TEXT,
  step_by_step JSONB DEFAULT '[]',
  common_mistakes JSONB DEFAULT '[]',
  hints JSONB DEFAULT '[]',
  xp_value INTEGER NOT NULL DEFAULT 10,
  streak_eligible BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique slug constraint
CREATE UNIQUE INDEX idx_predict_output_problems_slug ON public.predict_output_problems(slug);

-- Index for querying by skill
CREATE INDEX idx_predict_output_problems_skill_id ON public.predict_output_problems(skill_id);

-- Index for querying published problems
CREATE INDEX idx_predict_output_problems_status ON public.predict_output_problems(status);

-- Enable RLS
ALTER TABLE public.predict_output_problems ENABLE ROW LEVEL SECURITY;

-- RLS Policies for predict_output_problems
CREATE POLICY "Admins can manage all predict output problems"
  ON public.predict_output_problems FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can create predict output problems"
  ON public.predict_output_problems FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'moderator'::app_role)
    AND created_by = auth.uid()
  );

CREATE POLICY "Moderators can update own predict output problems"
  ON public.predict_output_problems FOR UPDATE
  USING (
    has_role(auth.uid(), 'moderator'::app_role)
    AND created_by = auth.uid()
  );

CREATE POLICY "Anyone can view published predict output problems"
  ON public.predict_output_problems FOR SELECT
  USING (
    status = 'published'
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'moderator'::app_role) AND created_by = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_predict_output_problems_updated_at
  BEFORE UPDATE ON public.predict_output_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Table: predict_output_attempts
-- =============================================
CREATE TABLE public.predict_output_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  problem_id UUID NOT NULL REFERENCES public.predict_output_problems(id) ON DELETE CASCADE,
  user_output TEXT NOT NULL DEFAULT '',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  revealed BOOLEAN NOT NULL DEFAULT false,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  score_awarded INTEGER NOT NULL DEFAULT 0,
  time_taken INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user+problem lookups
CREATE INDEX idx_predict_output_attempts_user_problem ON public.predict_output_attempts(user_id, problem_id);

-- Enable RLS
ALTER TABLE public.predict_output_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for predict_output_attempts
CREATE POLICY "Users can view own attempts"
  ON public.predict_output_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON public.predict_output_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts"
  ON public.predict_output_attempts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
