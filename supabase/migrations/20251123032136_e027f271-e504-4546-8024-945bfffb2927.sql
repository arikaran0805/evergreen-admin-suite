-- Add hero highlight fields to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_highlight_text TEXT DEFAULT 'Think Differently',
ADD COLUMN IF NOT EXISTS hero_highlight_color TEXT DEFAULT '#22c55e';