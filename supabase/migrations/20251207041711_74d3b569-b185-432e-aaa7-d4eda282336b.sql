
-- Create course_enrollments table
CREATE TABLE public.course_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Create course_reviews table
CREATE TABLE public.course_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for enrollments
CREATE POLICY "Anyone can view enrollment counts" ON public.course_enrollments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can enroll" ON public.course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unenroll themselves" ON public.course_enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.course_reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.course_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON public.course_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON public.course_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on reviews
CREATE TRIGGER update_course_reviews_updated_at
  BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
