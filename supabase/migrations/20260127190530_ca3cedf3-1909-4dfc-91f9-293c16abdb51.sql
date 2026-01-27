-- Create table to track career welcome page views per user per career
CREATE TABLE public.career_welcome_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, career_id)
);

-- Enable RLS
ALTER TABLE public.career_welcome_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own welcome views
CREATE POLICY "Users can view own career welcome views"
ON public.career_welcome_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own welcome views
CREATE POLICY "Users can insert own career welcome views"
ON public.career_welcome_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add index for fast lookups
CREATE INDEX idx_career_welcome_views_user_career ON public.career_welcome_views(user_id, career_id);