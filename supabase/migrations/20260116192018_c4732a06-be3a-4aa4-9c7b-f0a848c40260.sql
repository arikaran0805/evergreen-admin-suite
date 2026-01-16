-- Add lexicographic rank columns for ordering
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS lesson_rank VARCHAR(255) DEFAULT 'a';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS post_rank VARCHAR(255) DEFAULT 'a';

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_course_lessons_rank ON public.course_lessons(course_id, lesson_rank);
CREATE INDEX IF NOT EXISTS idx_posts_lesson_rank ON public.posts(lesson_id, post_rank);

-- Migrate existing lesson_order to lesson_rank (convert integer positions to lexicographic)
UPDATE public.course_lessons 
SET lesson_rank = LPAD(COALESCE(lesson_order, 0)::text, 10, '0')
WHERE lesson_rank IS NULL OR lesson_rank = 'a';

-- Migrate existing posts lesson_order to post_rank
UPDATE public.posts 
SET post_rank = LPAD(COALESCE(lesson_order, 0)::text, 10, '0')
WHERE post_rank IS NULL OR post_rank = 'a';