-- Add scheduling columns for announcement bar
ALTER TABLE public.site_settings
ADD COLUMN announcement_start_date timestamp with time zone DEFAULT NULL,
ADD COLUMN announcement_end_date timestamp with time zone DEFAULT NULL;