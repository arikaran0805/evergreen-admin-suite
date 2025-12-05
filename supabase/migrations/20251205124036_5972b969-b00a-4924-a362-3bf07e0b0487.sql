-- Make user_id nullable to allow anonymous comments
ALTER TABLE public.comments ALTER COLUMN user_id DROP NOT NULL;

-- Add is_anonymous column for logged-in users who want to hide their name
ALTER TABLE public.comments ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

-- Add display_name column for anonymous users (optional name)
ALTER TABLE public.comments ADD COLUMN display_name text DEFAULT 'unknown_ant';

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.comments;

-- Create new policies allowing anonymous comments
CREATE POLICY "Anyone can create comments"
ON public.comments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view approved comments"
ON public.comments
FOR SELECT
USING ((status = 'approved') OR has_role(auth.uid(), 'admin') OR (auth.uid() = user_id));