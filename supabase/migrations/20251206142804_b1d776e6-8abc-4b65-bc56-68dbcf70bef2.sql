-- Add announcement bar settings to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS announcement_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS announcement_message text DEFAULT 'New courses available! Learn the latest skills today.',
ADD COLUMN IF NOT EXISTS announcement_link_text text DEFAULT 'Explore now →',
ADD COLUMN IF NOT EXISTS announcement_link_url text DEFAULT '/courses';