-- Add entity_type and title columns, make lesson_id nullable for user-created notes
-- entity_type: 'lesson' (contextual, linked to lesson), 'user' (user-created, course-scoped)

-- First, make lesson_id nullable
ALTER TABLE public.lesson_notes ALTER COLUMN lesson_id DROP NOT NULL;

-- Add entity_type column with default 'lesson' for backward compatibility
ALTER TABLE public.lesson_notes 
ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'lesson';

-- Add title column for user-created notes
ALTER TABLE public.lesson_notes 
ADD COLUMN title TEXT;

-- Update existing notes to have entity_type = 'lesson'
UPDATE public.lesson_notes SET entity_type = 'lesson' WHERE entity_type IS NULL;

-- Add a check constraint to ensure data integrity
-- If entity_type = 'lesson', lesson_id must not be null
-- If entity_type = 'user', lesson_id must be null
ALTER TABLE public.lesson_notes ADD CONSTRAINT check_note_type_consistency 
CHECK (
  (entity_type = 'lesson' AND lesson_id IS NOT NULL) OR
  (entity_type = 'user' AND lesson_id IS NULL)
);

-- Create index for faster queries on entity_type
CREATE INDEX IF NOT EXISTS idx_lesson_notes_entity_type ON public.lesson_notes(entity_type);

-- Create index for user-created notes lookup
CREATE INDEX IF NOT EXISTS idx_lesson_notes_user_course ON public.lesson_notes(user_id, course_id) WHERE entity_type = 'user';