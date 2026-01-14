-- Add super_moderator to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_moderator';