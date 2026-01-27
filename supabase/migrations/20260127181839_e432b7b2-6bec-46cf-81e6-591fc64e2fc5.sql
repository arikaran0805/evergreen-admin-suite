-- Add is_anonymous column to course_reviews table
ALTER TABLE public.course_reviews 
ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;