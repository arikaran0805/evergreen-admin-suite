
-- Create fix_error_problems table for debugging-based coding challenges
CREATE TABLE public.fix_error_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.practice_skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  language TEXT NOT NULL DEFAULT 'python',
  tags TEXT[] DEFAULT '{}'::text[],
  description TEXT DEFAULT '',
  buggy_code TEXT NOT NULL DEFAULT '',
  correct_code TEXT NOT NULL DEFAULT '',
  validation_type TEXT NOT NULL DEFAULT 'output_comparison',
  test_cases JSONB DEFAULT '[]'::jsonb,
  expected_output TEXT DEFAULT '',
  custom_validator TEXT DEFAULT '',
  failure_message TEXT DEFAULT 'Your fix didn''t resolve the issue. Try again!',
  success_message TEXT DEFAULT 'Great job! You found and fixed the bug!',
  hints JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique slug per skill
CREATE UNIQUE INDEX fix_error_problems_slug_skill_unique ON public.fix_error_problems (skill_id, slug);

-- Enable RLS
ALTER TABLE public.fix_error_problems ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all fix error problems"
ON public.fix_error_problems FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can create fix error problems"
ON public.fix_error_problems FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) AND (created_by = auth.uid()));

CREATE POLICY "Moderators can update own fix error problems"
ON public.fix_error_problems FOR UPDATE
USING (has_role(auth.uid(), 'moderator'::app_role) AND (created_by = auth.uid()));

CREATE POLICY "Anyone can view published fix error problems"
ON public.fix_error_problems FOR SELECT
USING (
  (status = 'published') OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'moderator'::app_role) AND (created_by = auth.uid()))
);

-- Create fix_error_mappings table for linking to sub-topics
CREATE TABLE public.fix_error_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fix_error_problem_id UUID NOT NULL REFERENCES public.fix_error_problems(id) ON DELETE CASCADE,
  sub_topic_id UUID NOT NULL REFERENCES public.sub_topics(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  context_note TEXT
);

ALTER TABLE public.fix_error_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all fix error mappings"
ON public.fix_error_mappings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view fix error mappings"
ON public.fix_error_mappings FOR SELECT
USING (true);

CREATE POLICY "Moderators can create fix error mappings"
ON public.fix_error_mappings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Moderators can delete fix error mappings"
ON public.fix_error_mappings FOR DELETE
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_fix_error_problems_updated_at
BEFORE UPDATE ON public.fix_error_problems
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
