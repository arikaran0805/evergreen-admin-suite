-- Add code_theme column to site_settings table
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS code_theme TEXT DEFAULT 'tomorrow';