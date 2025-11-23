-- Add lesson_order column to posts table
ALTER TABLE public.posts 
ADD COLUMN lesson_order integer DEFAULT 0;

-- Create index for efficient ordering
CREATE INDEX idx_posts_lesson_order ON public.posts(lesson_order);

-- Update existing posts with sequential order based on created_at
WITH ordered_posts AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) as row_num
  FROM public.posts
)
UPDATE public.posts
SET lesson_order = ordered_posts.row_num
FROM ordered_posts
WHERE posts.id = ordered_posts.id;