-- Expand allowed post statuses to support the moderation workflow
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE public.posts ADD CONSTRAINT posts_status_check
CHECK (
  status = ANY (
    ARRAY[
      'draft'::text,
      'pending'::text,
      'changes_requested'::text,
      'rejected'::text,
      'published'::text,
      'archived'::text
    ]
  )
);