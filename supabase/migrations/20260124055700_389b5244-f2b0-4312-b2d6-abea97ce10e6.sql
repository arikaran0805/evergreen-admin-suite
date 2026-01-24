-- Create tag_bookmarks table for favoriting tags
CREATE TABLE public.tag_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag_id)
);

-- Enable Row Level Security
ALTER TABLE public.tag_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tag bookmarks" 
ON public.tag_bookmarks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag bookmarks" 
ON public.tag_bookmarks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag bookmarks" 
ON public.tag_bookmarks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_tag_bookmarks_user_id ON public.tag_bookmarks(user_id);
CREATE INDEX idx_tag_bookmarks_tag_id ON public.tag_bookmarks(tag_id);