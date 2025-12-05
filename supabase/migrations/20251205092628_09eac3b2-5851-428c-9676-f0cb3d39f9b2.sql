-- Add auto_ads setting if it doesn't exist
INSERT INTO public.ad_settings (setting_key, setting_value, description)
VALUES ('auto_ads', 'false', 'Enable Google Auto Ads to automatically place and optimize ads')
ON CONFLICT (setting_key) DO NOTHING;