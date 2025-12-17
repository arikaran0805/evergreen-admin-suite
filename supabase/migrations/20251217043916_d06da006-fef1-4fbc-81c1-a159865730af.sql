-- Add streak freeze columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS streak_freezes_available integer NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS streak_freezes_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_freeze_date date DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.streak_freezes_available IS 'Number of streak freezes the user has available to use';
COMMENT ON COLUMN public.profiles.streak_freezes_used IS 'Total number of streak freezes used by the user';
COMMENT ON COLUMN public.profiles.last_freeze_date IS 'The last date a streak freeze was applied';