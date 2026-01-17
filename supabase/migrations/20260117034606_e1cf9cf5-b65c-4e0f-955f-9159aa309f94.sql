-- Create course_assignments table for Senior Moderator and Moderator ownership
-- This allows multiple users per course with different roles
CREATE TABLE public.course_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    role app_role NOT NULL CHECK (role IN ('senior_moderator', 'moderator')),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id, role)
);

-- Enable RLS
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is assigned to a course
CREATE OR REPLACE FUNCTION public.is_assigned_to_course(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_assignments
    WHERE user_id = _user_id
      AND course_id = _course_id
  )
$$;

-- Create function to check if user is assigned to a course with a specific role
CREATE OR REPLACE FUNCTION public.is_assigned_to_course_with_role(_user_id uuid, _course_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_assignments
    WHERE user_id = _user_id
      AND course_id = _course_id
      AND role = _role
  )
$$;

-- Create function to check if a course belongs to a user's assigned career (for Super Moderators)
CREATE OR REPLACE FUNCTION public.owns_course_via_career(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.career_courses cc
    JOIN public.career_assignments ca ON cc.career_id = ca.career_id
    WHERE ca.user_id = _user_id
      AND cc.course_id = _course_id
      AND cc.deleted_at IS NULL
  )
$$;

-- RLS Policies for course_assignments

-- Admins can do everything
CREATE POLICY "Admins can manage all course_assignments"
ON public.course_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Super Moderators can view/manage assignments for courses in their careers
CREATE POLICY "Super Moderators can view course assignments in their careers"
ON public.course_assignments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'super_moderator')
  AND public.owns_course_via_career(auth.uid(), course_id)
);

CREATE POLICY "Super Moderators can insert course assignments in their careers"
ON public.course_assignments
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'super_moderator')
  AND public.owns_course_via_career(auth.uid(), course_id)
);

CREATE POLICY "Super Moderators can delete course assignments in their careers"
ON public.course_assignments
FOR DELETE
USING (
  public.has_role(auth.uid(), 'super_moderator')
  AND public.owns_course_via_career(auth.uid(), course_id)
);

-- Users can see their own assignments
CREATE POLICY "Users can view own course assignments"
ON public.course_assignments
FOR SELECT
USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_course_assignments_user_id ON public.course_assignments(user_id);
CREATE INDEX idx_course_assignments_course_id ON public.course_assignments(course_id);
CREATE INDEX idx_course_assignments_user_course ON public.course_assignments(user_id, course_id);