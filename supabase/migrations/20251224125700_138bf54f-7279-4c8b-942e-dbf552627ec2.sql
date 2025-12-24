
-- Create delete_requests table
CREATE TABLE public.delete_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'course' or 'post'
  content_id uuid NOT NULL,
  content_title text NOT NULL,
  requested_by uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delete_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all delete requests
CREATE POLICY "Admins can manage all delete requests"
ON public.delete_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Moderators can view their own requests
CREATE POLICY "Moderators can view own delete requests"
ON public.delete_requests
FOR SELECT
USING (has_role(auth.uid(), 'moderator'::app_role) AND auth.uid() = requested_by);

-- Moderators can create delete requests
CREATE POLICY "Moderators can create delete requests"
ON public.delete_requests
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) AND auth.uid() = requested_by);

-- Create trigger for updated_at
CREATE TRIGGER update_delete_requests_updated_at
  BEFORE UPDATE ON public.delete_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
