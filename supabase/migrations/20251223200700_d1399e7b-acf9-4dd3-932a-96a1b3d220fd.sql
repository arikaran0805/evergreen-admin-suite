-- Add code_theme column to posts table for per-post theme selection
ALTER TABLE public.posts 
ADD COLUMN code_theme TEXT DEFAULT NULL;