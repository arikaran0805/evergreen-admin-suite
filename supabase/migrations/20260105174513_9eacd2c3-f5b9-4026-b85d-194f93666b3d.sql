-- Create admin_notifications table for notifying admins about content submissions
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  content_id TEXT,
  content_type TEXT,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view their own notifications
CREATE POLICY "Admins can view their own notifications"
ON public.admin_notifications
FOR SELECT
USING (auth.uid() = admin_id);

-- Admins can update their own notifications (mark as read)
CREATE POLICY "Admins can update their own notifications"
ON public.admin_notifications
FOR UPDATE
USING (auth.uid() = admin_id);

-- Admins can delete their own notifications
CREATE POLICY "Admins can delete their own notifications"
ON public.admin_notifications
FOR DELETE
USING (auth.uid() = admin_id);

-- Allow insert from authenticated users (for triggers/functions)
CREATE POLICY "Allow insert for authenticated users"
ON public.admin_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_admin_notifications_admin_id ON public.admin_notifications(admin_id);
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications(is_read);

-- Enable realtime for admin_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Function to notify all admins when content is submitted for approval
CREATE OR REPLACE FUNCTION public.notify_admins_on_content_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  submitter_name TEXT;
  content_title TEXT;
  notification_type TEXT;
BEGIN
  -- Only trigger when status changes to pending_approval or pending
  IF NEW.status IN ('pending_approval', 'pending') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('pending_approval', 'pending')) THEN
    
    -- Get submitter name
    SELECT COALESCE(full_name, email) INTO submitter_name
    FROM public.profiles
    WHERE id = COALESCE(NEW.author_id, NEW.assigned_to);
    
    -- Get content title
    IF TG_TABLE_NAME = 'posts' THEN
      content_title := NEW.title;
      notification_type := 'post';
    ELSIF TG_TABLE_NAME = 'courses' THEN
      content_title := NEW.name;
      notification_type := 'course';
    ELSIF TG_TABLE_NAME = 'careers' THEN
      content_title := NEW.name;
      notification_type := 'career';
    ELSIF TG_TABLE_NAME = 'tags' THEN
      content_title := NEW.name;
      notification_type := 'tag';
    END IF;
    
    -- Notify all admins
    FOR admin_record IN 
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.admin_notifications (
        admin_id,
        type,
        title,
        message,
        content_id,
        content_type,
        submitted_by
      ) VALUES (
        admin_record.user_id,
        'content_submitted',
        'New content pending approval',
        COALESCE(submitter_name, 'A moderator') || ' submitted "' || content_title || '" for approval',
        NEW.id::TEXT,
        notification_type,
        COALESCE(NEW.author_id, NEW.assigned_to)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for posts, courses, careers, and tags
CREATE TRIGGER notify_admins_on_post_submission
AFTER INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_content_submission();

CREATE TRIGGER notify_admins_on_course_submission
AFTER INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_content_submission();

CREATE TRIGGER notify_admins_on_career_submission
AFTER INSERT OR UPDATE ON public.careers
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_content_submission();

CREATE TRIGGER notify_admins_on_tag_submission
AFTER INSERT OR UPDATE ON public.tags
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_content_submission();