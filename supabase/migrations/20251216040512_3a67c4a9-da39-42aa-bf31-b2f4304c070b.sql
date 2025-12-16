-- Add max_streak column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_streak integer DEFAULT 0;

-- Add current_streak column to profiles table for persistence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;

-- Add last_activity_date to track streak continuity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_activity_date date;