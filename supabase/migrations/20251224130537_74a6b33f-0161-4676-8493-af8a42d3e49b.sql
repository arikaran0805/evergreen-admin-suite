
-- Allow moderators to insert post_tags for their own posts
CREATE POLICY "Moderators can add tags to own posts"
ON public.post_tags
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'moderator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_tags.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
);

-- Allow moderators to delete post_tags for their own posts
CREATE POLICY "Moderators can remove tags from own posts"
ON public.post_tags
FOR DELETE
USING (
  has_role(auth.uid(), 'moderator'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE posts.id = post_tags.post_id 
    AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
  )
);
