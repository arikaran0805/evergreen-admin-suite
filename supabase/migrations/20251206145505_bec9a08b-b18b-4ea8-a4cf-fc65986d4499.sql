-- Add announcement background color to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN announcement_bg_color text DEFAULT '#22c55e';