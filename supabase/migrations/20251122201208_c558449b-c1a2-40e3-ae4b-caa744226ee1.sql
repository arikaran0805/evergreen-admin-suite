-- Add social media link columns to site_settings
ALTER TABLE public.site_settings
ADD COLUMN twitter_url TEXT,
ADD COLUMN facebook_url TEXT,
ADD COLUMN instagram_url TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN youtube_url TEXT,
ADD COLUMN github_url TEXT;