-- Add foreign key constraint from post_annotations.author_id to profiles.id
ALTER TABLE public.post_annotations
ADD CONSTRAINT post_annotations_author_id_fkey
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint from annotation_replies.author_id to profiles.id
ALTER TABLE public.annotation_replies
ADD CONSTRAINT annotation_replies_author_id_fkey
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;