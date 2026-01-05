
-- Function to notify moderator when admin approves/rejects/requests changes on their content
CREATE OR REPLACE FUNCTION public.notify_moderator_on_approval_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_author_id UUID;
  content_title TEXT;
  admin_name TEXT;
  is_performer_admin BOOLEAN;
  is_author_moderator BOOLEAN;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get content author and title based on content type
  IF NEW.content_type = 'post' THEN
    SELECT author_id, title INTO content_author_id, content_title
    FROM public.posts
    WHERE id::TEXT = NEW.content_id;
  ELSIF NEW.content_type = 'course' THEN
    SELECT author_id, name INTO content_author_id, content_title
    FROM public.courses
    WHERE id::TEXT = NEW.content_id;
  ELSIF NEW.content_type = 'career' THEN
    SELECT author_id, name INTO content_author_id, content_title
    FROM public.careers
    WHERE id::TEXT = NEW.content_id;
  ELSIF NEW.content_type = 'tag' THEN
    SELECT author_id, name INTO content_author_id, content_title
    FROM public.tags
    WHERE id::TEXT = NEW.content_id;
  END IF;
  
  -- Check if performer is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.performed_by AND role = 'admin'
  ) INTO is_performer_admin;
  
  -- Check if content author is a moderator (and not an admin)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = content_author_id AND role = 'moderator'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = content_author_id AND role = 'admin'
  ) INTO is_author_moderator;
  
  -- Only notify if admin takes action on moderator's content
  IF is_performer_admin AND is_author_moderator AND content_author_id IS NOT NULL THEN
    -- Get admin name
    SELECT COALESCE(full_name, email) INTO admin_name
    FROM public.profiles
    WHERE id = NEW.performed_by;
    
    -- Determine notification type and message based on action
    CASE NEW.action
      WHEN 'approved' THEN
        notification_type := 'approved';
        notification_title := 'Content Approved';
        notification_message := COALESCE(admin_name, 'An admin') || ' approved your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
      WHEN 'rejected' THEN
        notification_type := 'rejected';
        notification_title := 'Content Rejected';
        notification_message := COALESCE(admin_name, 'An admin') || ' rejected your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
        IF NEW.feedback IS NOT NULL AND NEW.feedback != '' THEN
          notification_message := notification_message || '. Reason: ' || LEFT(NEW.feedback, 100);
        END IF;
      WHEN 'changes_requested' THEN
        notification_type := 'changes_requested';
        notification_title := 'Changes Requested';
        notification_message := COALESCE(admin_name, 'An admin') || ' requested changes on your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
        IF NEW.feedback IS NOT NULL AND NEW.feedback != '' THEN
          notification_message := notification_message || ': ' || LEFT(NEW.feedback, 100);
        END IF;
      ELSE
        notification_type := NEW.action;
        notification_title := 'Content Update';
        notification_message := COALESCE(admin_name, 'An admin') || ' updated the status of your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
    END CASE;
    
    -- Create notification for the moderator
    INSERT INTO public.moderator_notifications (
      user_id,
      type,
      title,
      message,
      content_id,
      content_type
    ) VALUES (
      content_author_id,
      notification_type,
      notification_title,
      notification_message,
      NEW.content_id,
      NEW.content_type
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for approval actions
CREATE TRIGGER notify_moderator_on_approval_action_insert
AFTER INSERT ON public.approval_history
FOR EACH ROW
EXECUTE FUNCTION public.notify_moderator_on_approval_action();
