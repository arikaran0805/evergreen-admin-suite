-- Remove the parent_id column from posts table (no longer needed with lesson manager)
ALTER TABLE public.posts DROP COLUMN IF EXISTS parent_id;