-- Function to notify moderator when admin adds annotation to their content
CREATE OR REPLACE FUNCTION public.notify_moderator_on_annotation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  annotator_name TEXT;
  is_annotator_admin BOOLEAN;
  is_author_moderator BOOLEAN;
BEGIN
  -- Get the post author and title
  SELECT author_id, title INTO post_author_id, post_title
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Check if annotator is an admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.author_id AND role = 'admin'
  ) INTO is_annotator_admin;
  
  -- Check if post author is a moderator (and not an admin)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = post_author_id AND role = 'moderator'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = post_author_id AND role = 'admin'
  ) INTO is_author_moderator;
  
  -- Only notify if admin annotates moderator's content
  IF is_annotator_admin AND is_author_moderator AND post_author_id IS NOT NULL THEN
    -- Get annotator name
    SELECT COALESCE(full_name, email) INTO annotator_name
    FROM public.profiles
    WHERE id = NEW.author_id;
    
    -- Create notification for the moderator
    INSERT INTO public.moderator_notifications (
      user_id,
      type,
      title,
      message,
      content_id,
      content_type
    ) VALUES (
      post_author_id,
      'annotation_added',
      'New annotation on your content',
      COALESCE(annotator_name, 'An admin') || ' added an annotation to "' || COALESCE(post_title, 'your post') || '": "' || LEFT(NEW.selected_text, 50) || CASE WHEN LENGTH(NEW.selected_text) > 50 THEN '...' ELSE '' END || '"',
      NEW.post_id::TEXT,
      'post'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for annotations
CREATE TRIGGER notify_moderator_on_annotation_insert
AFTER INSERT ON public.post_annotations
FOR EACH ROW
EXECUTE FUNCTION public.notify_moderator_on_annotation();