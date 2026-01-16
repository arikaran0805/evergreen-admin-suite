-- Create table to track session invalidations
CREATE TABLE public.session_invalidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'role_changed',
  invalidated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.session_invalidations ENABLE ROW LEVEL SECURITY;

-- Users can only read their own invalidation records
CREATE POLICY "Users can read own invalidations"
ON public.session_invalidations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can insert invalidation records
CREATE POLICY "Admins can insert invalidations"
ON public.session_invalidations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_invalidations;

-- Create trigger function to invalidate session when role changes
CREATE OR REPLACE FUNCTION public.invalidate_session_on_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT (new role assigned) or DELETE (role removed), invalidate the user's session
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.session_invalidations (user_id, reason, created_by)
    VALUES (NEW.user_id, 'role_changed', auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.session_invalidations (user_id, reason, created_by)
    VALUES (OLD.user_id, 'role_changed', auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.session_invalidations (user_id, reason, created_by)
    VALUES (NEW.user_id, 'role_changed', auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on user_roles table
CREATE TRIGGER on_role_change_invalidate_session
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_session_on_role_change();