-- Drop the existing unique constraint on slug
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_slug_key;

-- Add a composite unique constraint on slug + category_id (course)
-- This allows the same slug in different courses but prevents duplicates within the same course
ALTER TABLE public.posts ADD CONSTRAINT posts_slug_category_unique UNIQUE (slug, category_id);