-- Create table for post version bookmarks
CREATE TABLE public.post_version_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.post_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(version_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.post_version_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own version bookmarks" 
ON public.post_version_bookmarks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own version bookmarks" 
ON public.post_version_bookmarks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own version bookmarks" 
ON public.post_version_bookmarks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_version_bookmarks_user_id ON public.post_version_bookmarks(user_id);
CREATE INDEX idx_version_bookmarks_version_id ON public.post_version_bookmarks(version_id);