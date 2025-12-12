
-- Create careers table
CREATE TABLE public.careers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Briefcase',
  color TEXT NOT NULL DEFAULT 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create career_skills table for skill areas per career
CREATE TABLE public.career_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create career_courses junction table
CREATE TABLE public.career_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  skill_contributions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(career_id, course_id)
);

-- Enable RLS
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_courses ENABLE ROW LEVEL SECURITY;

-- Careers policies
CREATE POLICY "Anyone can view careers" ON public.careers FOR SELECT USING (true);
CREATE POLICY "Admins can manage careers" ON public.careers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Career skills policies
CREATE POLICY "Anyone can view career skills" ON public.career_skills FOR SELECT USING (true);
CREATE POLICY "Admins can manage career skills" ON public.career_skills FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Career courses policies
CREATE POLICY "Anyone can view career courses" ON public.career_courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage career courses" ON public.career_courses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_careers_updated_at
  BEFORE UPDATE ON public.careers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default careers
INSERT INTO public.careers (name, slug, description, icon, color, display_order) VALUES
('Data Science', 'data-science', 'Analyze data and build predictive models', 'Brain', 'bg-purple-500/10 text-purple-500 border-purple-500/30', 1),
('Data Engineer', 'data-engineer', 'Build and maintain data pipelines', 'Database', 'bg-blue-500/10 text-blue-500 border-blue-500/30', 2),
('ML Engineer', 'ml-engineer', 'Deploy machine learning models at scale', 'Layers', 'bg-orange-500/10 text-orange-500 border-orange-500/30', 3),
('Data Analyst', 'analyst', 'Transform data into actionable insights', 'BarChart3', 'bg-green-500/10 text-green-500 border-green-500/30', 4),
('Full Stack Developer', 'full-stack', 'Build complete web applications', 'Code2', 'bg-pink-500/10 text-pink-500 border-pink-500/30', 5),
('Business Analyst', 'business-analyst', 'Bridge business and technology', 'Briefcase', 'bg-teal-500/10 text-teal-500 border-teal-500/30', 6),
('DevOps Engineer', 'devops-engineer', 'Automate and optimize infrastructure', 'Server', 'bg-red-500/10 text-red-500 border-red-500/30', 7),
('Cloud Architect', 'cloud-architect', 'Design cloud infrastructure solutions', 'Cloud', 'bg-sky-500/10 text-sky-500 border-sky-500/30', 8);

-- Insert default skills for each career
INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Data Analysis', 1), ('Machine Learning', 2), ('Statistics', 3), ('Python', 4), ('SQL', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'data-science';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Data Pipelines', 1), ('SQL', 2), ('Python', 3), ('Cloud Services', 4), ('Data Modeling', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'data-engineer';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Machine Learning', 1), ('Deep Learning', 2), ('MLOps', 3), ('Python', 4), ('Model Deployment', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'ml-engineer';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Data Visualization', 1), ('SQL', 2), ('Statistics', 3), ('Excel', 4), ('Reporting', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'analyst';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Frontend', 1), ('Backend', 2), ('Database', 3), ('APIs', 4), ('DevOps', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'full-stack';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Requirements', 1), ('Process Modeling', 2), ('Data Analysis', 3), ('Communication', 4), ('Documentation', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'business-analyst';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('CI/CD', 1), ('Containers', 2), ('Automation', 3), ('Monitoring', 4), ('Security', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'devops-engineer';

INSERT INTO public.career_skills (career_id, skill_name, display_order)
SELECT c.id, s.skill_name, s.display_order
FROM public.careers c
CROSS JOIN (
  VALUES 
    ('Cloud Platforms', 1), ('Networking', 2), ('Security', 3), ('Cost Optimization', 4), ('Architecture', 5)
) AS s(skill_name, display_order)
WHERE c.slug = 'cloud-architect';
