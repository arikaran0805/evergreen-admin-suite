-- Create ad_settings table to store Google AdSense and other ad configurations
CREATE TABLE public.ad_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage ad settings" 
ON public.ad_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view ad settings" 
ON public.ad_settings 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_ad_settings_updated_at
BEFORE UPDATE ON public.ad_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings
INSERT INTO public.ad_settings (setting_key, setting_value, description) VALUES
('google_ad_client', '', 'Google AdSense Publisher ID (e.g., ca-pub-XXXXXXXXXXXXXXXX)'),
('sidebar_top_slot', '', 'Ad slot ID for sidebar top position'),
('sidebar_middle_slot', '', 'Ad slot ID for sidebar middle position'),
('sidebar_bottom_slot', '', 'Ad slot ID for sidebar bottom position'),
('in_content_top_slot', '', 'Ad slot ID for in-content top position'),
('in_content_middle_slot', '', 'Ad slot ID for in-content middle position'),
('in_content_bottom_slot', '', 'Ad slot ID for in-content bottom position'),
('third_party_sidebar_code', '', 'Third-party ad code for sidebar middle (overrides AdSense)');