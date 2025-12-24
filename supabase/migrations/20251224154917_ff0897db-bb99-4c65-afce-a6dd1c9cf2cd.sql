-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Authors can update own or assigned posts" ON public.posts;
DROP POLICY IF EXISTS "Authors and moderators can create posts" ON public.posts;
DROP POLICY IF EXISTS "Moderators can update own or assigned courses" ON public.courses;
DROP POLICY IF EXISTS "Moderators can create courses" ON public.courses;

-- Posts: Admins can update any post with any status
CREATE POLICY "Admins can update all posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Posts: Moderators can only update own/assigned posts with restricted status
CREATE POLICY "Moderators can update own posts with restricted status"
ON public.posts
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND NOT has_role(auth.uid(), 'admin'::app_role)
  AND (auth.uid() = author_id OR auth.uid() = assigned_to)
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND NOT has_role(auth.uid(), 'admin'::app_role)
  AND status IN ('draft', 'pending')
);

-- Posts: Moderators can only create posts with draft or pending status
CREATE POLICY "Moderators can create posts with restricted status"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'moderator'::app_role) 
      AND status IN ('draft', 'pending')
    )
  )
);

-- Courses: Admins can update any course with any status (already covered by ALL policy)
-- Courses: Moderators can only update own/assigned courses with restricted status
CREATE POLICY "Moderators can update own courses with restricted status"
ON public.courses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND NOT has_role(auth.uid(), 'admin'::app_role)
  AND (auth.uid() = author_id OR auth.uid() = assigned_to)
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND NOT has_role(auth.uid(), 'admin'::app_role)
  AND status IN ('draft', 'pending')
);

-- Courses: Moderators can only create courses with draft or pending status
CREATE POLICY "Moderators can create courses with restricted status"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND has_role(auth.uid(), 'moderator'::app_role)
  AND status IN ('draft', 'pending')
);