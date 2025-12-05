-- Create comment_reactions table for likes/dislikes
CREATE TABLE public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (comment_id, session_id)
);

-- Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view comment reactions"
ON public.comment_reactions FOR SELECT
USING (true);

-- Anyone can insert reactions (using session_id for anonymous)
CREATE POLICY "Anyone can insert comment reactions"
ON public.comment_reactions FOR INSERT
WITH CHECK (true);

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
ON public.comment_reactions FOR UPDATE
USING (session_id = session_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.comment_reactions FOR DELETE
USING (session_id = session_id);

-- Add parent_id to comments for replies
ALTER TABLE public.comments ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;