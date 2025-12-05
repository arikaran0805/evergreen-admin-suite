-- Change default status for comments from 'pending' to 'approved'
ALTER TABLE public.comments ALTER COLUMN status SET DEFAULT 'approved';