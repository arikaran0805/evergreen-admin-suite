-- Create predict_output_mappings table to link predict output problems to sub-topics
CREATE TABLE public.predict_output_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  predict_output_problem_id UUID NOT NULL REFERENCES public.predict_output_problems(id) ON DELETE CASCADE,
  sub_topic_id UUID NOT NULL REFERENCES public.sub_topics(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  context_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(predict_output_problem_id, sub_topic_id)
);

-- Enable RLS
ALTER TABLE public.predict_output_mappings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage all predict output mappings"
  ON public.predict_output_mappings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view mappings (needed for learner-facing views)
CREATE POLICY "Anyone can view predict output mappings"
  ON public.predict_output_mappings FOR SELECT
  USING (true);

-- Moderators can create mappings
CREATE POLICY "Moderators can create predict output mappings"
  ON public.predict_output_mappings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Moderators can delete own mappings
CREATE POLICY "Moderators can delete predict output mappings"
  ON public.predict_output_mappings FOR DELETE
  USING (has_role(auth.uid(), 'moderator'::app_role));