-- Add selected_career column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN selected_career text DEFAULT 'data-science';