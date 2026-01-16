
-- =============================================
-- LESSON-BASED COURSE STRUCTURE MIGRATION
-- Career → Course → Lesson → Post
-- =============================================

-- 1. Add soft delete to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Add is_primary and soft delete to career_courses
ALTER TABLE public.career_courses 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Create course_lessons table (lessons are first-class entities)
-- NO unique constraint initially - we'll add it after data migration
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lesson_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 4. Add lesson_id to posts table (new hierarchy)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS lesson_id UUID,
ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'content',
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 5. Create indexes for lesson queries
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_order ON public.course_lessons(course_id, lesson_order);
CREATE INDEX IF NOT EXISTS idx_posts_lesson_id ON public.posts(lesson_id);

-- 6. Enable RLS on course_lessons
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for course_lessons
CREATE POLICY "Anyone can view published lessons" 
ON public.course_lessons 
FOR SELECT 
USING (
  is_published = true 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);

CREATE POLICY "Admins can manage all lessons" 
ON public.course_lessons 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can create lessons" 
ON public.course_lessons 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND created_by = auth.uid()
);

CREATE POLICY "Moderators can update own lessons" 
ON public.course_lessons 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND created_by = auth.uid()
);

-- 8. Trigger for updated_at on course_lessons
CREATE TRIGGER update_course_lessons_updated_at
BEFORE UPDATE ON public.course_lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- 9. Migrate existing posts (where parent_id IS NULL) to lessons with unique ordering
INSERT INTO public.course_lessons (id, course_id, title, lesson_order, is_published, created_by, created_at, updated_at)
SELECT 
  p.id,
  p.category_id,
  p.title,
  (ROW_NUMBER() OVER (PARTITION BY p.category_id ORDER BY COALESCE(p.lesson_order, 0), p.created_at) - 1)::INTEGER as lesson_order,
  p.status = 'published',
  p.author_id,
  p.created_at,
  p.updated_at
FROM public.posts p
WHERE p.parent_id IS NULL 
  AND p.category_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 10. Now add the unique constraint after data migration
ALTER TABLE public.course_lessons
ADD CONSTRAINT unique_lesson_order_per_course UNIQUE (course_id, lesson_order) DEFERRABLE INITIALLY DEFERRED;

-- 11. Add foreign key for lesson_id now that lessons exist
ALTER TABLE public.posts 
ADD CONSTRAINT fk_posts_lesson_id 
FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON DELETE SET NULL;

-- 12. Add foreign key for approved_by
ALTER TABLE public.posts 
ADD CONSTRAINT fk_posts_approved_by 
FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 13. Update posts that were sub-lessons to point to their parent lesson
UPDATE public.posts 
SET lesson_id = parent_id
WHERE parent_id IS NOT NULL 
  AND lesson_id IS NULL;

-- 14. For main posts (now lessons), set their lesson_id to themselves for backward compatibility
UPDATE public.posts 
SET lesson_id = id
WHERE parent_id IS NULL 
  AND category_id IS NOT NULL 
  AND lesson_id IS NULL;

-- 15. Update lesson_progress table to support new structure
ALTER TABLE public.lesson_progress
ADD COLUMN IF NOT EXISTS course_lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE;

-- 16. Migrate lesson_progress to use course_lesson_id
UPDATE public.lesson_progress lp
SET course_lesson_id = cl.id
FROM public.course_lessons cl
WHERE lp.lesson_id = cl.id
  AND lp.course_lesson_id IS NULL;
