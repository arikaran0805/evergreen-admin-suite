-- Drop the existing constraint and recreate with pending status
ALTER TABLE public.posts DROP CONSTRAINT posts_status_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'pending'::text]));