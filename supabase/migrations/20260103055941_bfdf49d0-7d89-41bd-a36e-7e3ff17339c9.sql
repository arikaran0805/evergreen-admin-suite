-- Add chat bubble color customization fields to site_settings
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS mentor_bubble_bg VARCHAR(50) DEFAULT '#d4f5e6',
ADD COLUMN IF NOT EXISTS mentor_bubble_text VARCHAR(50) DEFAULT '#064e3b',
ADD COLUMN IF NOT EXISTS mentor_avatar_gradient_from VARCHAR(50) DEFAULT '#34d399',
ADD COLUMN IF NOT EXISTS mentor_avatar_gradient_to VARCHAR(50) DEFAULT '#059669',
ADD COLUMN IF NOT EXISTS course_bubble_bg VARCHAR(50) DEFAULT '#f1f5f9',
ADD COLUMN IF NOT EXISTS course_bubble_text VARCHAR(50) DEFAULT '#0f172a',
ADD COLUMN IF NOT EXISTS course_avatar_gradient_from VARCHAR(50) DEFAULT '#e2e8f0',
ADD COLUMN IF NOT EXISTS course_avatar_gradient_to VARCHAR(50) DEFAULT '#cbd5e1';