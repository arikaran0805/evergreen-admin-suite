-- Create table for annotation replies (threaded comments)
CREATE TABLE public.annotation_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annotation_id UUID NOT NULL REFERENCES public.post_annotations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.annotation_replies ENABLE ROW LEVEL SECURITY;

-- Create policies for annotation replies
CREATE POLICY "Users can view annotation replies"
ON public.annotation_replies
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create replies"
ON public.annotation_replies
FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own replies"
ON public.annotation_replies
FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Authors and admins can delete replies"
ON public.annotation_replies
FOR DELETE
USING (
  auth.uid() = author_id OR 
  public.has_role(auth.uid(), 'admin')
);