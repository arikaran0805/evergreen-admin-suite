-- Add assigned_to column to courses table for course assignment
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop and recreate the SELECT policy to include assigned courses visibility
DROP POLICY IF EXISTS "Anyone can view courses based on role" ON public.courses;

CREATE POLICY "Anyone can view courses based on role" 
ON public.courses 
FOR SELECT 
USING (
  status = 'approved' 
  OR status = 'published'
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'moderator'::app_role) AND (auth.uid() = author_id OR auth.uid() = assigned_to))
);

-- Update the UPDATE policy for moderators to include assigned courses
DROP POLICY IF EXISTS "Moderators can update own courses" ON public.courses;

CREATE POLICY "Moderators can update own or assigned courses" 
ON public.courses 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND (auth.uid() = author_id OR auth.uid() = assigned_to)
);

-- Add assigned_to column to posts table as well for post assignment
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update posts SELECT policy to include assigned posts
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;

CREATE POLICY "Anyone can view posts based on role" 
ON public.posts 
FOR SELECT 
USING (
  status = 'published' 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR (auth.uid() = author_id)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND auth.uid() = assigned_to)
);

-- Update posts UPDATE policy to include assigned posts
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;

CREATE POLICY "Authors can update own or assigned posts" 
ON public.posts 
FOR UPDATE 
USING (
  auth.uid() = author_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND auth.uid() = assigned_to)
);