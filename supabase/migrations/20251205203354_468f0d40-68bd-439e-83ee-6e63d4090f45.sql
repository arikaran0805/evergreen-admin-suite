-- Add column for search placeholder texts
ALTER TABLE public.site_settings 
ADD COLUMN search_placeholders text[] DEFAULT ARRAY['Search courses...', 'Find lessons...', 'Explore topics...', 'Learn something new...'];