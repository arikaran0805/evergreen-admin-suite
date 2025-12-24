-- Create post_versions table to track all content versions
CREATE TABLE public.post_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  content text NOT NULL,
  editor_type text DEFAULT 'rich-text', -- 'rich-text' or 'chat'
  edited_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_published boolean DEFAULT false,
  change_summary text
);

-- Create index for faster lookups
CREATE INDEX idx_post_versions_post_id ON public.post_versions(post_id);
CREATE INDEX idx_post_versions_created_at ON public.post_versions(created_at DESC);

-- Create unique constraint for version numbers per post
CREATE UNIQUE INDEX idx_post_versions_unique ON public.post_versions(post_id, version_number);

-- Create post_annotations table for inline comments
CREATE TABLE public.post_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.post_versions(id) ON DELETE SET NULL,
  author_id uuid NOT NULL,
  selection_start integer NOT NULL,
  selection_end integer NOT NULL,
  selected_text text NOT NULL,
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'dismissed'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  bubble_index integer, -- For chat editor: which bubble the annotation is on
  editor_type text DEFAULT 'rich-text'
);

-- Create index for annotations
CREATE INDEX idx_post_annotations_post_id ON public.post_annotations(post_id);

-- Enable RLS
ALTER TABLE public.post_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_annotations ENABLE ROW LEVEL SECURITY;

-- Post versions policies
CREATE POLICY "Admins can manage all versions"
ON public.post_versions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can view own post versions"
ON public.post_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_versions.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
);

CREATE POLICY "Moderators can create versions for own posts"
ON public.post_versions FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_versions.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  ) AND
  auth.uid() = edited_by
);

-- Annotations policies
CREATE POLICY "Admins can manage all annotations"
ON public.post_annotations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authors can view annotations on own posts"
ON public.post_annotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_annotations.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
);

CREATE POLICY "Moderators can update annotation status"
ON public.post_annotations FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_annotations.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
);