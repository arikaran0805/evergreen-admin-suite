-- Remove the check constraint on categories.level column
-- This allows any difficulty level values from the difficulty_levels table
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_level_check;