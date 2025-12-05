-- Create post_shares table for tracking shares
CREATE TABLE public.post_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX idx_post_shares_created_at ON public.post_shares(created_at);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert shares (for tracking)
CREATE POLICY "Anyone can insert post shares"
ON public.post_shares
FOR INSERT
WITH CHECK (true);

-- Only admins can view shares
CREATE POLICY "Admins can view all post shares"
ON public.post_shares
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
));