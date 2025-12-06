-- Add image_url and redirect_url columns to ads table for image-based ads
ALTER TABLE public.ads 
ADD COLUMN image_url TEXT,
ADD COLUMN redirect_url TEXT;

-- Make ad_code nullable since we're moving to image-based ads
ALTER TABLE public.ads 
ALTER COLUMN ad_code DROP NOT NULL;