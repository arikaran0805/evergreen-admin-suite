-- Add senior_moderator to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'senior_moderator';

-- Update the has_role function to include the new role (already handles it generically)
-- No changes needed to the function as it works with any app_role value