-- Create practice_skills table for skill cards
CREATE TABLE public.practice_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'Code2',
  display_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create practice_problems table for problems within skills
CREATE TABLE public.practice_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID NOT NULL REFERENCES public.practice_skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  sub_topic TEXT NOT NULL,
  description TEXT,
  examples JSONB DEFAULT '[]'::jsonb,
  constraints JSONB DEFAULT '[]'::jsonb,
  hints JSONB DEFAULT '[]'::jsonb,
  starter_code JSONB DEFAULT '{}'::jsonb,
  solution TEXT,
  is_premium BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(skill_id, slug)
);

-- Enable RLS
ALTER TABLE public.practice_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_problems ENABLE ROW LEVEL SECURITY;

-- RLS policies for practice_skills
CREATE POLICY "Anyone can view published skills"
  ON public.practice_skills FOR SELECT
  USING (status = 'published' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all skills"
  ON public.practice_skills FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for practice_problems
CREATE POLICY "Anyone can view published problems"
  ON public.practice_problems FOR SELECT
  USING (
    status = 'published' 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage all problems"
  ON public.practice_problems FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_practice_skills_status ON public.practice_skills(status);
CREATE INDEX idx_practice_skills_display_order ON public.practice_skills(display_order);
CREATE INDEX idx_practice_problems_skill_id ON public.practice_problems(skill_id);
CREATE INDEX idx_practice_problems_status ON public.practice_problems(status);
CREATE INDEX idx_practice_problems_sub_topic ON public.practice_problems(sub_topic);

-- Create updated_at trigger for practice_skills
CREATE TRIGGER update_practice_skills_updated_at
  BEFORE UPDATE ON public.practice_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for practice_problems
CREATE TRIGGER update_practice_problems_updated_at
  BEFORE UPDATE ON public.practice_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();