-- Add icon and color columns to career_skills table
ALTER TABLE public.career_skills 
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Code2',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'Emerald';