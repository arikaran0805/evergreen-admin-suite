-- Create difficulty_levels table
CREATE TABLE public.difficulty_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.difficulty_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for difficulty levels
CREATE POLICY "Anyone can view difficulty levels" 
ON public.difficulty_levels 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage difficulty levels" 
ON public.difficulty_levels 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Insert default difficulty levels
INSERT INTO public.difficulty_levels (name, display_order) VALUES
  ('Beginner', 1),
  ('Intermediate', 2),
  ('Advanced', 3),
  ('Beginner - Advanced', 4),
  ('Intermediate - Advanced', 5);