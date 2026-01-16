-- Remove the deprecated lesson_order column from posts table (now using post_rank for ordering)
ALTER TABLE public.posts DROP COLUMN IF EXISTS lesson_order;