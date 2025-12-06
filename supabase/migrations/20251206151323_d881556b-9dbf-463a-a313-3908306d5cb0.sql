-- Add text color column for announcement bar
ALTER TABLE public.site_settings
ADD COLUMN announcement_text_color text DEFAULT '#ffffff';