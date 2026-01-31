-- ===========================================
-- UNLOCKEMORY PRACTICE SYSTEM V2
-- Parallel system alongside existing tables
-- ===========================================

-- 1. Add course_id to practice_skills (for auto-linking)
ALTER TABLE public.practice_skills 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- 2. Create sub_topics table
CREATE TABLE IF NOT EXISTS public.sub_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.practice_skills(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Create problem_mappings table (enables problem reuse)
CREATE TABLE IF NOT EXISTS public.problem_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  sub_topic_id uuid NOT NULL REFERENCES public.sub_topics(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  context_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(problem_id, sub_topic_id)
);

-- 4. Create learner_problem_progress table
CREATE TABLE IF NOT EXISTS public.learner_problem_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL REFERENCES public.practice_problems(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unsolved' CHECK (status IN ('unsolved', 'attempted', 'solved')),
  solved_at timestamp with time zone,
  attempts integer NOT NULL DEFAULT 0,
  best_runtime_ms integer,
  best_memory_mb numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, problem_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_topics_lesson_id ON public.sub_topics(lesson_id);
CREATE INDEX IF NOT EXISTS idx_sub_topics_skill_id ON public.sub_topics(skill_id);
CREATE INDEX IF NOT EXISTS idx_problem_mappings_problem_id ON public.problem_mappings(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_mappings_sub_topic_id ON public.problem_mappings(sub_topic_id);
CREATE INDEX IF NOT EXISTS idx_learner_problem_progress_user_id ON public.learner_problem_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_skills_course_id ON public.practice_skills(course_id);

-- 6. Enable RLS on new tables
ALTER TABLE public.sub_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_problem_progress ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for sub_topics
CREATE POLICY "Admins can manage all sub_topics" ON public.sub_topics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can manage sub_topics" ON public.sub_topics
  FOR ALL USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Anyone can view sub_topics" ON public.sub_topics
  FOR SELECT USING (true);

-- 8. RLS Policies for problem_mappings
CREATE POLICY "Admins can manage all problem_mappings" ON public.problem_mappings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can manage problem_mappings" ON public.problem_mappings
  FOR ALL USING (has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Anyone can view problem_mappings" ON public.problem_mappings
  FOR SELECT USING (true);

-- 9. RLS Policies for learner_problem_progress
CREATE POLICY "Users can view own progress" ON public.learner_problem_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.learner_problem_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.learner_problem_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" ON public.learner_problem_progress
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. Function to auto-create practice skill when course is created
CREATE OR REPLACE FUNCTION public.auto_create_practice_skill_for_course()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if not already linked
  IF NOT EXISTS (
    SELECT 1 FROM public.practice_skills WHERE course_id = NEW.id
  ) THEN
    INSERT INTO public.practice_skills (name, slug, course_id, status, created_by)
    VALUES (
      NEW.name,
      NEW.slug,
      NEW.id,
      'draft',
      NEW.author_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Trigger for auto-creating practice skill
DROP TRIGGER IF EXISTS trigger_auto_create_practice_skill ON public.courses;
CREATE TRIGGER trigger_auto_create_practice_skill
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_practice_skill_for_course();

-- 12. Function to auto-create default sub-topic when lesson is created
CREATE OR REPLACE FUNCTION public.auto_create_default_sub_topic_for_lesson()
RETURNS TRIGGER AS $$
DECLARE
  v_skill_id uuid;
BEGIN
  -- Find the practice skill for this course
  SELECT id INTO v_skill_id
  FROM public.practice_skills
  WHERE course_id = NEW.course_id
  LIMIT 1;
  
  -- Only create if skill exists
  IF v_skill_id IS NOT NULL THEN
    INSERT INTO public.sub_topics (lesson_id, skill_id, title, is_default, created_by)
    VALUES (
      NEW.id,
      v_skill_id,
      NEW.title,
      true,
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 13. Trigger for auto-creating default sub-topic
DROP TRIGGER IF EXISTS trigger_auto_create_default_sub_topic ON public.course_lessons;
CREATE TRIGGER trigger_auto_create_default_sub_topic
  AFTER INSERT ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_default_sub_topic_for_lesson();

-- 14. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sub_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sub_topics_updated_at
  BEFORE UPDATE ON public.sub_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sub_topics_updated_at();

CREATE OR REPLACE FUNCTION public.update_learner_problem_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_learner_problem_progress_updated_at
  BEFORE UPDATE ON public.learner_problem_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_learner_problem_progress_updated_at();