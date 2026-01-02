-- Add status column to post_versions (replacing is_published boolean)
ALTER TABLE public.post_versions 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- Add versioning note type for quick-select reasons
ALTER TABLE public.post_versions 
ADD COLUMN IF NOT EXISTS versioning_note_type text;

-- Add versioning note locked flag
ALTER TABLE public.post_versions 
ADD COLUMN IF NOT EXISTS versioning_note_locked boolean NOT NULL DEFAULT false;

-- Migrate existing is_published data to status
UPDATE public.post_versions 
SET status = CASE 
  WHEN is_published = true THEN 'published'
  ELSE 'draft'
END;

-- Add constraint to ensure valid status values
ALTER TABLE public.post_versions 
ADD CONSTRAINT post_versions_status_check 
CHECK (status IN ('draft', 'published', 'archived'));

-- Create function to ensure only one published version per post
CREATE OR REPLACE FUNCTION public.ensure_single_published_version()
RETURNS TRIGGER AS $$
BEGIN
  -- When publishing a version, archive all other published versions for this post
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    UPDATE public.post_versions 
    SET status = 'archived', versioning_note_locked = true
    WHERE post_id = NEW.post_id 
    AND id != NEW.id 
    AND status = 'published';
    
    -- Lock the versioning note when publishing
    NEW.versioning_note_locked := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for single published version enforcement
DROP TRIGGER IF EXISTS ensure_single_published_version_trigger ON public.post_versions;
CREATE TRIGGER ensure_single_published_version_trigger
BEFORE INSERT OR UPDATE ON public.post_versions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_published_version();

-- Create index for faster queries on post versions by status
CREATE INDEX IF NOT EXISTS idx_post_versions_post_status ON public.post_versions(post_id, status);

-- Update RLS policies for the new status column
DROP POLICY IF EXISTS "Published versions viewable by everyone" ON public.post_versions;
CREATE POLICY "Published versions viewable by everyone" 
ON public.post_versions 
FOR SELECT 
USING (
  status = 'published' 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_versions.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
);

-- Moderators can update draft versions (including versioning notes)
DROP POLICY IF EXISTS "Moderators can update draft versions" ON public.post_versions;
CREATE POLICY "Moderators can update draft versions"
ON public.post_versions
FOR UPDATE
USING (
  has_role(auth.uid(), 'moderator'::app_role) 
  AND status = 'draft'
  AND EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_versions.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role)
  AND (status = 'draft' OR status = 'published')
);