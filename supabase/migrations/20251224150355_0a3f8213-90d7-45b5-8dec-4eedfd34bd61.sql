-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view courses based on role" ON public.courses;

-- Create a new policy that allows:
-- 1. Anyone (including anonymous) can see published/approved courses
-- 2. Admins can see all courses
-- 3. Moderators can see all published/approved courses PLUS their own non-published courses
CREATE POLICY "Anyone can view published courses or own courses"
ON public.courses
FOR SELECT
USING (
  -- Published/approved courses are visible to everyone
  status IN ('approved', 'published')
  -- Admins can see all courses
  OR has_role(auth.uid(), 'admin'::app_role)
  -- Moderators can see their own courses regardless of status
  OR (has_role(auth.uid(), 'moderator'::app_role) AND (auth.uid() = author_id OR auth.uid() = assigned_to))
);