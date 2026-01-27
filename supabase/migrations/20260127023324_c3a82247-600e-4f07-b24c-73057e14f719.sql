-- Update RLS policy for careers to allow viewing published careers (matching other content patterns)
DROP POLICY IF EXISTS "Anyone can view approved careers" ON public.careers;

CREATE POLICY "Anyone can view published careers" 
ON public.careers 
FOR SELECT 
USING (
  status = 'published' 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND auth.uid() = author_id)
);