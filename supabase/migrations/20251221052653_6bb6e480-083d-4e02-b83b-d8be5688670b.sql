-- Add weight column to career_skills for calculating weighted career readiness
ALTER TABLE public.career_skills 
ADD COLUMN weight integer NOT NULL DEFAULT 25;

-- Add a comment explaining the column
COMMENT ON COLUMN public.career_skills.weight IS 'Percentage weight of this skill towards total career readiness (should sum to 100 across all skills in a career)';