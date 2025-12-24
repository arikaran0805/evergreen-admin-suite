-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;

-- Create a new SELECT policy that allows:
-- 1. Anyone to view approved/published courses
-- 2. Admins to view all courses
-- 3. Moderators to view all courses (for admin panel functionality)
CREATE POLICY "Anyone can view courses based on role" 
ON public.courses 
FOR SELECT 
USING (
  status = 'approved' 
  OR status = 'published'
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);