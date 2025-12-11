-- Create table to track time spent on lessons
CREATE TABLE public.lesson_time_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  course_id UUID NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id, tracked_date)
);

-- Enable RLS
ALTER TABLE public.lesson_time_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own time tracking"
  ON public.lesson_time_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own time tracking"
  ON public.lesson_time_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time tracking"
  ON public.lesson_time_tracking
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_lesson_time_tracking_updated_at
  BEFORE UPDATE ON public.lesson_time_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();