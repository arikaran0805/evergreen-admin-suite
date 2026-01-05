-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Admin notification preferences
  content_submissions BOOLEAN NOT NULL DEFAULT true,
  reports BOOLEAN NOT NULL DEFAULT true,
  new_users BOOLEAN NOT NULL DEFAULT true,
  delete_requests BOOLEAN NOT NULL DEFAULT true,
  -- Moderator notification preferences
  content_approved BOOLEAN NOT NULL DEFAULT true,
  content_rejected BOOLEAN NOT NULL DEFAULT true,
  changes_requested BOOLEAN NOT NULL DEFAULT true,
  annotations BOOLEAN NOT NULL DEFAULT true,
  -- General preferences
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to get user notification preference
CREATE OR REPLACE FUNCTION public.get_notification_preference(p_user_id UUID, p_preference_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref_value BOOLEAN;
BEGIN
  EXECUTE format('SELECT %I FROM public.notification_preferences WHERE user_id = $1', p_preference_type)
  INTO pref_value
  USING p_user_id;
  
  -- Return true if no preferences set (default behavior)
  RETURN COALESCE(pref_value, true);
END;
$$;

-- Update admin notification trigger to respect preferences
CREATE OR REPLACE FUNCTION public.notify_admins_on_content_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  submitter_name TEXT;
  content_title TEXT;
  notification_type TEXT;
  admin_pref BOOLEAN;
BEGIN
  IF NEW.status IN ('pending_approval', 'pending') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('pending_approval', 'pending')) THEN
    
    SELECT COALESCE(full_name, email) INTO submitter_name
    FROM public.profiles
    WHERE id = COALESCE(NEW.author_id, NEW.assigned_to);
    
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
    
    FOR admin_record IN 
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      -- Check if admin wants content submission notifications
      SELECT COALESCE(content_submissions, true) INTO admin_pref
      FROM public.notification_preferences
      WHERE user_id = admin_record.user_id;
      
      IF COALESCE(admin_pref, true) THEN
        INSERT INTO public.admin_notifications (
          admin_id, type, title, message, content_id, content_type, submitted_by
        ) VALUES (
          admin_record.user_id, 'content_submitted', 'New content pending approval',
          COALESCE(submitter_name, 'A moderator') || ' submitted "' || content_title || '" for approval',
          NEW.id::TEXT, notification_type, COALESCE(NEW.author_id, NEW.assigned_to)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update moderator approval notification trigger to respect preferences
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
  user_pref BOOLEAN;
  pref_column TEXT;
BEGIN
  IF NEW.content_type = 'post' THEN
    SELECT author_id, title INTO content_author_id, content_title
    FROM public.posts WHERE id::TEXT = NEW.content_id;
  ELSIF NEW.content_type = 'course' THEN
    SELECT author_id, name INTO content_author_id, content_title
    FROM public.courses WHERE id::TEXT = NEW.content_id;
  ELSIF NEW.content_type = 'career' THEN
    SELECT author_id, name INTO content_author_id, content_title
    FROM public.careers WHERE id::TEXT = NEW.content_id;
  ELSIF NEW.content_type = 'tag' THEN
    SELECT author_id, name INTO content_author_id, content_title
    FROM public.tags WHERE id::TEXT = NEW.content_id;
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.performed_by AND role = 'admin'
  ) INTO is_performer_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = content_author_id AND role = 'moderator'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = content_author_id AND role = 'admin'
  ) INTO is_author_moderator;
  
  IF is_performer_admin AND is_author_moderator AND content_author_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email) INTO admin_name
    FROM public.profiles WHERE id = NEW.performed_by;
    
    CASE NEW.action
      WHEN 'approved' THEN
        notification_type := 'approved';
        notification_title := 'Content Approved';
        notification_message := COALESCE(admin_name, 'An admin') || ' approved your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
        pref_column := 'content_approved';
      WHEN 'rejected' THEN
        notification_type := 'rejected';
        notification_title := 'Content Rejected';
        notification_message := COALESCE(admin_name, 'An admin') || ' rejected your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
        IF NEW.feedback IS NOT NULL AND NEW.feedback != '' THEN
          notification_message := notification_message || '. Reason: ' || LEFT(NEW.feedback, 100);
        END IF;
        pref_column := 'content_rejected';
      WHEN 'changes_requested' THEN
        notification_type := 'changes_requested';
        notification_title := 'Changes Requested';
        notification_message := COALESCE(admin_name, 'An admin') || ' requested changes on your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
        IF NEW.feedback IS NOT NULL AND NEW.feedback != '' THEN
          notification_message := notification_message || ': ' || LEFT(NEW.feedback, 100);
        END IF;
        pref_column := 'changes_requested';
      ELSE
        notification_type := NEW.action;
        notification_title := 'Content Update';
        notification_message := COALESCE(admin_name, 'An admin') || ' updated the status of your ' || NEW.content_type || ' "' || COALESCE(content_title, 'Untitled') || '"';
        pref_column := 'content_approved';
    END CASE;
    
    -- Check user preference
    EXECUTE format('SELECT COALESCE(%I, true) FROM public.notification_preferences WHERE user_id = $1', pref_column)
    INTO user_pref USING content_author_id;
    
    IF COALESCE(user_pref, true) THEN
      INSERT INTO public.moderator_notifications (
        user_id, type, title, message, content_id, content_type
      ) VALUES (
        content_author_id, notification_type, notification_title, notification_message, NEW.content_id, NEW.content_type
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update annotation notification trigger to respect preferences
CREATE OR REPLACE FUNCTION public.notify_moderator_on_annotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  annotator_name TEXT;
  is_annotator_admin BOOLEAN;
  is_author_moderator BOOLEAN;
  user_pref BOOLEAN;
BEGIN
  SELECT author_id, title INTO post_author_id, post_title
  FROM public.posts WHERE id = NEW.post_id;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.author_id AND role = 'admin'
  ) INTO is_annotator_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = post_author_id AND role = 'moderator'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = post_author_id AND role = 'admin'
  ) INTO is_author_moderator;
  
  IF is_annotator_admin AND is_author_moderator AND post_author_id IS NOT NULL THEN
    -- Check user preference for annotations
    SELECT COALESCE(annotations, true) INTO user_pref
    FROM public.notification_preferences WHERE user_id = post_author_id;
    
    IF COALESCE(user_pref, true) THEN
      SELECT COALESCE(full_name, email) INTO annotator_name
      FROM public.profiles WHERE id = NEW.author_id;
      
      INSERT INTO public.moderator_notifications (
        user_id, type, title, message, content_id, content_type
      ) VALUES (
        post_author_id, 'annotation_added', 'New annotation on your content',
        COALESCE(annotator_name, 'An admin') || ' added an annotation to "' || COALESCE(post_title, 'your post') || '": "' || LEFT(NEW.selected_text, 50) || CASE WHEN LENGTH(NEW.selected_text) > 50 THEN '...' ELSE '' END || '"',
        NEW.post_id::TEXT, 'post'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;