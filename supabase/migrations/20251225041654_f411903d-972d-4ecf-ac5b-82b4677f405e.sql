-- Add notification time window setting to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS notification_window_days INTEGER DEFAULT 7;