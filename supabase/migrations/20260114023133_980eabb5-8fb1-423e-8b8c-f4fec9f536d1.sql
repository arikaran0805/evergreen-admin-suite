-- Create career_assignments table for Super Moderator ownership
CREATE TABLE public.career_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, career_id)
);

-- Enable RLS
ALTER TABLE public.career_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_assignments
-- Admins can do everything
CREATE POLICY "Admins can manage career assignments"
ON public.career_assignments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Super Moderators can view their own assignments
CREATE POLICY "Super Moderators can view own assignments"
ON public.career_assignments
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'super_moderator'));

-- Create function to check if user owns a career
CREATE OR REPLACE FUNCTION public.owns_career(_user_id uuid, _career_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.career_assignments
    WHERE user_id = _user_id
      AND career_id = _career_id
  )
$$;

-- Create function to check if user owns a course (via career assignment)
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
    JOIN public.career_assignments ca ON ca.career_id = cc.career_id
    WHERE ca.user_id = _user_id
      AND cc.course_id = _course_id
  )
$$;

-- Create function to check if user owns a post (via career -> course assignment)
CREATE OR REPLACE FUNCTION public.owns_post_via_career(_user_id uuid, _post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    JOIN public.career_courses cc ON cc.course_id = p.category_id
    JOIN public.career_assignments ca ON ca.career_id = cc.career_id
    WHERE ca.user_id = _user_id
      AND p.id = _post_id
  )
$$;

-- Add default_senior_moderator column to courses if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'default_senior_moderator'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN default_senior_moderator UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_career_assignments_user_id ON public.career_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_career_assignments_career_id ON public.career_assignments(career_id);