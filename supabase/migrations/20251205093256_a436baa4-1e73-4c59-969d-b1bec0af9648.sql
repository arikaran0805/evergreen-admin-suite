-- Add schema markup columns to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'Organization',
ADD COLUMN IF NOT EXISTS schema_contact_email text,
ADD COLUMN IF NOT EXISTS schema_phone text,
ADD COLUMN IF NOT EXISTS schema_address text,
ADD COLUMN IF NOT EXISTS schema_same_as text[];