-- Add icon and learning_hours columns to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS icon text,
ADD COLUMN IF NOT EXISTS learning_hours numeric DEFAULT 0;