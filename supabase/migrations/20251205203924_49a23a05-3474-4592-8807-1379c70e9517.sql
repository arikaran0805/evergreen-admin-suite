-- Add column for hero quick links (array of objects with label and slug)
ALTER TABLE public.site_settings 
ADD COLUMN hero_quick_links jsonb DEFAULT '[{"label": "Python", "slug": "python-for-data-science", "highlighted": true}, {"label": "Statistics", "slug": "statistics", "highlighted": false}, {"label": "AI & ML", "slug": "ai-ml", "highlighted": false}]'::jsonb;