-- Create storage bucket for ad images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-images', 'ad-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view ad images (public bucket)
CREATE POLICY "Anyone can view ad images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-images');

-- Allow admins to upload ad images
CREATE POLICY "Admins can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ad-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update ad images
CREATE POLICY "Admins can update ad images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ad-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete ad images
CREATE POLICY "Admins can delete ad images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ad-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);