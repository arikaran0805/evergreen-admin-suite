-- Add status and author fields to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add status and author fields to careers table  
ALTER TABLE public.careers
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id);

-- Add status and author fields to tags table
ALTER TABLE public.tags
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id);

-- Create approval_history table to track all approval actions
CREATE TABLE IF NOT EXISTS public.approval_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'post', 'course', 'career', 'tag'
  content_id uuid NOT NULL,
  action text NOT NULL, -- 'submitted', 'approved', 'rejected', 'changes_requested'
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on approval_history
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all approval history
CREATE POLICY "Admins can view all approval history"
ON public.approval_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Policy: Users can view approval history for their own content
CREATE POLICY "Users can view own content approval history"
ON public.approval_history
FOR SELECT
USING (performed_by = auth.uid());

-- Policy: Admins can insert approval history
CREATE POLICY "Admins can insert approval history"
ON public.approval_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Update posts RLS to allow moderators to manage their own posts
DROP POLICY IF EXISTS "Authors can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;

CREATE POLICY "Authors and moderators can create posts"
ON public.posts
FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND 
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
);

CREATE POLICY "Authors can update own posts"
ON public.posts
FOR UPDATE
USING (
  auth.uid() = author_id OR has_role(auth.uid(), 'admin')
);

-- Update courses RLS for moderators
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;

CREATE POLICY "Admins can manage all courses"
ON public.courses
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can create courses"
ON public.courses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id);

CREATE POLICY "Moderators can update own courses"
ON public.courses
FOR UPDATE
USING (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id);

CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
USING (
  status = 'approved' OR 
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id)
);

-- Update careers RLS for moderators
DROP POLICY IF EXISTS "Admins can manage careers" ON public.careers;
DROP POLICY IF EXISTS "Anyone can view careers" ON public.careers;

CREATE POLICY "Admins can manage all careers"
ON public.careers
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can create careers"
ON public.careers
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id);

CREATE POLICY "Moderators can update own careers"
ON public.careers
FOR UPDATE
USING (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id);

CREATE POLICY "Anyone can view approved careers"
ON public.careers
FOR SELECT
USING (
  status = 'approved' OR 
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id)
);

-- Update tags RLS for moderators
DROP POLICY IF EXISTS "Admins can manage tags" ON public.tags;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;

CREATE POLICY "Admins can manage all tags"
ON public.tags
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can create tags"
ON public.tags
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id);

CREATE POLICY "Moderators can update own tags"
ON public.tags
FOR UPDATE
USING (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id);

CREATE POLICY "Anyone can view approved tags"
ON public.tags
FOR SELECT
USING (
  status = 'approved' OR 
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'moderator') AND auth.uid() = author_id)
);

-- Create index for faster approval queue queries
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_careers_status ON public.careers(status);
CREATE INDEX IF NOT EXISTS idx_tags_status ON public.tags(status);
CREATE INDEX IF NOT EXISTS idx_approval_history_content ON public.approval_history(content_type, content_id);