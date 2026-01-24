-- Create a junction table for course prerequisites linking
CREATE TABLE public.course_prerequisites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Either a linked course OR text description must be provided
  CONSTRAINT prerequisite_type_check CHECK (
    (prerequisite_course_id IS NOT NULL AND prerequisite_text IS NULL) OR
    (prerequisite_course_id IS NULL AND prerequisite_text IS NOT NULL)
  ),
  
  -- Prevent duplicate course links
  CONSTRAINT unique_course_prerequisite UNIQUE (course_id, prerequisite_course_id)
);

-- Enable RLS
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Anyone can view prerequisites
CREATE POLICY "Anyone can view course prerequisites"
ON public.course_prerequisites
FOR SELECT
USING (true);

-- Admins can manage all prerequisites
CREATE POLICY "Admins can manage course prerequisites"
ON public.course_prerequisites
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can manage prerequisites for their own courses
CREATE POLICY "Moderators can manage own course prerequisites"
ON public.course_prerequisites
FOR ALL
USING (
  has_role(auth.uid(), 'moderator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_prerequisites.course_id
    AND (courses.author_id = auth.uid() OR courses.assigned_to = auth.uid())
  )
);

-- Add index for faster lookups
CREATE INDEX idx_course_prerequisites_course_id ON public.course_prerequisites(course_id);
CREATE INDEX idx_course_prerequisites_prereq_course_id ON public.course_prerequisites(prerequisite_course_id);

-- Add comment for documentation
COMMENT ON TABLE public.course_prerequisites IS 'Stores course prerequisites - either linked to another course or as text description';