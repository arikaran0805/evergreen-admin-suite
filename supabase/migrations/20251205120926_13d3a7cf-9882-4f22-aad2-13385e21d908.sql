-- Rename categories table to courses
ALTER TABLE public.categories RENAME TO courses;

-- Update the foreign key constraint on posts table
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_category_id_fkey;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_course_id_fkey 
  FOREIGN KEY (category_id) 
  REFERENCES public.courses(id);

-- Update RLS policies (need to recreate them with new table name)
DROP POLICY IF EXISTS "Admins can manage categories" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.courses;

CREATE POLICY "Admins can manage courses" 
ON public.courses 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view courses" 
ON public.courses 
FOR SELECT 
USING (true);