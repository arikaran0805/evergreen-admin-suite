-- Create content_reports table for reports and suggestions
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'post', 'course', 'comment'
  content_id UUID NOT NULL,
  report_type TEXT NOT NULL, -- 'report' or 'suggestion'
  reason TEXT, -- for reports: 'spam', 'inappropriate', 'misleading', 'other'
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reporter_id UUID,
  reporter_email TEXT,
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a report/suggestion
CREATE POLICY "Anyone can submit reports"
ON public.content_reports
FOR INSERT
WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.content_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.content_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can view reports on their own content
CREATE POLICY "Moderators can view reports on own content"
ON public.content_reports
FOR SELECT
USING (
  has_role(auth.uid(), 'moderator'::app_role) AND (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = content_reports.content_id 
      AND (posts.author_id = auth.uid() OR posts.assigned_to = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = content_reports.content_id 
      AND (courses.author_id = auth.uid() OR courses.assigned_to = auth.uid())
    )
  )
);

-- Admins can update reports
CREATE POLICY "Admins can update reports"
ON public.content_reports
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.content_reports
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_content_reports_updated_at
BEFORE UPDATE ON public.content_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();