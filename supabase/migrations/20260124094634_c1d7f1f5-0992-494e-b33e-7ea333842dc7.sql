-- Add prerequisites column to courses table
ALTER TABLE public.courses 
ADD COLUMN prerequisites TEXT[] DEFAULT '{}'::TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN public.courses.prerequisites IS 'Array of prerequisite descriptions for the course';