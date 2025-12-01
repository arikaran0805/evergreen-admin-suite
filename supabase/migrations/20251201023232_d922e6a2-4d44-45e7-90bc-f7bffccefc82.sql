-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_tags junction table for many-to-many relationship
CREATE TABLE public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Enable RLS on tags table
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Enable RLS on post_tags table
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
CREATE POLICY "Anyone can view tags"
ON public.tags
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tags"
ON public.tags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for post_tags table
CREATE POLICY "Anyone can view post tags"
ON public.post_tags
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage post tags"
ON public.post_tags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON public.post_tags(tag_id);
CREATE INDEX idx_tags_slug ON public.tags(slug);