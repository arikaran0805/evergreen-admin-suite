-- Create table for lesson-specific notes (premium feature)
CREATE TABLE public.lesson_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  course_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one note per user per lesson
ALTER TABLE public.lesson_notes ADD CONSTRAINT lesson_notes_user_lesson_unique UNIQUE (user_id, lesson_id);

-- Enable Row Level Security
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notes
CREATE POLICY "Users can view their own lesson notes"
ON public.lesson_notes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own notes
CREATE POLICY "Users can create their own lesson notes"
ON public.lesson_notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update their own lesson notes"
ON public.lesson_notes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own lesson notes"
ON public.lesson_notes
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_lesson_notes_user_id ON public.lesson_notes(user_id);
CREATE INDEX idx_lesson_notes_lesson_id ON public.lesson_notes(lesson_id);
CREATE INDEX idx_lesson_notes_course_id ON public.lesson_notes(course_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_lesson_notes_updated_at
BEFORE UPDATE ON public.lesson_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();