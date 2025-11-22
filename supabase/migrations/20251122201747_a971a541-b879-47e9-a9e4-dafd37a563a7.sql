-- Create social media clicks tracking table
CREATE TABLE public.social_media_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  user_id UUID,
  session_id TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.social_media_clicks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert click events
CREATE POLICY "Anyone can insert social media clicks" 
ON public.social_media_clicks 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view click analytics
CREATE POLICY "Admins can view social media clicks" 
ON public.social_media_clicks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for better query performance
CREATE INDEX idx_social_media_clicks_platform ON public.social_media_clicks(platform);
CREATE INDEX idx_social_media_clicks_clicked_at ON public.social_media_clicks(clicked_at);