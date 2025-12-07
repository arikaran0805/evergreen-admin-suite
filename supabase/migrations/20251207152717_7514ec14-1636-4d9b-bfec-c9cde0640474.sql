-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT bookmark_target_check CHECK (
    (course_id IS NOT NULL AND post_id IS NULL) OR 
    (course_id IS NULL AND post_id IS NOT NULL)
  ),
  CONSTRAINT unique_user_course_bookmark UNIQUE (user_id, course_id),
  CONSTRAINT unique_user_post_bookmark UNIQUE (user_id, post_id)
);

-- Enable Row Level Security
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bookmarks"
ON public.bookmarks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookmarks"
ON public.bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.bookmarks
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_bookmarks_course_id ON public.bookmarks(course_id);
CREATE INDEX idx_bookmarks_post_id ON public.bookmarks(post_id);