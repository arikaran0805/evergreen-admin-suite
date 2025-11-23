-- Add hero section fields to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS hero_headline TEXT DEFAULT 'Join Learners Who Think Differently',
ADD COLUMN IF NOT EXISTS hero_subheadline TEXT DEFAULT 'Learn through emojis, visuals, and stories that spark clarity, creativity, and deeper understanding.';