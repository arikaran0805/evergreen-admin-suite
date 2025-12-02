-- Create ads/monetization table
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  placement TEXT NOT NULL, -- e.g., 'header', 'sidebar', 'footer', 'in-content'
  ad_code TEXT NOT NULL, -- HTML/JS ad code
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create redirects table
CREATE TABLE public.redirects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  redirect_type INTEGER NOT NULL DEFAULT 301, -- 301 or 302
  is_active BOOLEAN NOT NULL DEFAULT true,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

-- RLS policies for ads
CREATE POLICY "Admins can manage ads"
ON public.ads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active ads"
ON public.ads FOR SELECT
USING (is_active = true);

-- RLS policies for redirects
CREATE POLICY "Admins can manage redirects"
ON public.redirects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active redirects"
ON public.redirects FOR SELECT
USING (is_active = true);

-- Create indexes
CREATE INDEX idx_ads_placement ON public.ads(placement);
CREATE INDEX idx_ads_active ON public.ads(is_active);
CREATE INDEX idx_redirects_source ON public.redirects(source_path);
CREATE INDEX idx_redirects_active ON public.redirects(is_active);

-- Triggers for updated_at
CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_redirects_updated_at
BEFORE UPDATE ON public.redirects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();