-- Add editor_role column to post_versions table
ALTER TABLE public.post_versions 
ADD COLUMN IF NOT EXISTS editor_role TEXT DEFAULT 'moderator';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_post_versions_editor_role ON public.post_versions(editor_role);

-- Comment for documentation
COMMENT ON COLUMN public.post_versions.editor_role IS 'Role of the editor: admin or moderator';